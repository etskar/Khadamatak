import "server-only";
import { db } from "@/lib/db";
import { createPaymentRequestPublicId, createShareToken } from "@/lib/ids";
import { generateSecureToken } from "@/lib/crypto";
import {
  buildIdempotencyKey,
  createPendingDeposit,
  transferBetweenWallets,
} from "@/server/finance/wallet-service";
import { writeAuditLog } from "@/lib/audit";
import { completeTransaction, creditWallet, debitWallet } from "@/server/finance/ledger";

const FUTURE_METHODS = [
  "visa",
  "mastercard",
  "apple_pay",
  "google_pay",
  "bancontact",
  "sepa",
  "paypal",
] as const;

export type DepositMethod = "ideal" | (typeof FUTURE_METHODS)[number];

async function finalizePendingDeposit(idempotencyKey: string, userId: string) {
  const pending = await db.financialTransaction.findUnique({
    where: { idempotencyKey },
  });
  if (!pending) throw new Error("DEPOSIT_NOT_FOUND");
  if (pending.status === "completed") return pending;

  return db.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("WALLET_NOT_FOUND");

    if (wallet.pendingCents >= pending.amountCents) {
      await debitWallet({
        tx,
        walletId: wallet.id,
        amountCents: pending.amountCents,
        bucket: "pending",
        transactionId: pending.id,
        description: "Clear pending deposit",
      });
    }

    await creditWallet({
      tx,
      walletId: wallet.id,
      amountCents: pending.amountCents,
      bucket: "available",
      transactionId: pending.id,
      description: "Deposit confirmed",
    });

    const done = await completeTransaction(tx, pending.id, "completed");

    await tx.notification.create({
      data: {
        userId,
        type: "wallet_deposit",
        title: "Deposit successful",
        body: `Your wallet was topped up with ${(pending.amountCents / 100).toFixed(2)} EUR`,
        href: "/wallet",
      },
    });

    return done;
  });
}

/**
 * Start a wallet top-up.
 * iDEAL via Mollie when MOLLIE_API_KEY is set; otherwise secure dev simulator.
 */
export async function startWalletTopUp(input: {
  userId: string;
  amountCents: number;
  method: DepositMethod;
  locale: string;
  returnPath: string;
}) {
  if (input.amountCents < 100) throw new Error("MIN_DEPOSIT");
  if (input.amountCents > 500_000_00) throw new Error("MAX_DEPOSIT");
  if (input.method !== "ideal") throw new Error("METHOD_NOT_ENABLED");

  const providerRef = `dep_${generateSecureToken(12)}`;
  const idempotencyKey = buildIdempotencyKey(input.userId, "deposit", providerRef);
  const mollieKey = process.env.MOLLIE_API_KEY;

  if (mollieKey) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mollieKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: {
          currency: "EUR",
          value: (input.amountCents / 100).toFixed(2),
        },
        description: "Khadamatak wallet top-up",
        redirectUrl: `${appUrl}${input.returnPath}`,
        webhookUrl:
          process.env.MOLLIE_WEBHOOK_URL ||
          `${appUrl}/api/payments/webhook/mollie`,
        method: "ideal",
        metadata: {
          userId: input.userId,
          idempotencyKey,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`MOLLIE_ERROR:${err}`);
    }

    const payment = (await res.json()) as {
      id: string;
      _links?: { checkout?: { href?: string } };
    };

    await createPendingDeposit({
      userId: input.userId,
      amountCents: input.amountCents,
      provider: "mollie",
      providerRef: payment.id,
      paymentMethod: "ideal",
      idempotencyKey,
    });

    return {
      mode: "mollie" as const,
      checkoutUrl: payment._links?.checkout?.href ?? null,
      providerRef: payment.id,
      completed: false,
    };
  }

  await createPendingDeposit({
    userId: input.userId,
    amountCents: input.amountCents,
    provider: "internal_dev",
    providerRef,
    paymentMethod: "ideal",
    idempotencyKey,
  });

  const completed = await finalizePendingDeposit(idempotencyKey, input.userId);

  await writeAuditLog({
    actorUserId: input.userId,
    action: "wallet.topup.dev",
    entityType: "FinancialTransaction",
    entityId: completed.id,
    metadata: { amountCents: input.amountCents, mode: "dev_simulator" },
  });

  return {
    mode: "dev" as const,
    checkoutUrl: null,
    providerRef,
    completed: true,
  };
}

export async function handleMollieWebhook(paymentId: string) {
  const mollieKey = process.env.MOLLIE_API_KEY;
  if (!mollieKey) throw new Error("MOLLIE_NOT_CONFIGURED");

  const res = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mollieKey}` },
  });
  if (!res.ok) throw new Error("MOLLIE_FETCH_FAILED");

  const payment = (await res.json()) as {
    id: string;
    status: string;
    amount: { value: string };
    metadata?: { userId?: string; idempotencyKey?: string };
  };

  await db.paymentProviderEvent.create({
    data: {
      provider: "mollie",
      eventId: payment.id,
      eventType: payment.status,
      payloadJson: JSON.stringify(payment),
      status: "received",
    },
  });

  if (payment.status !== "paid") return { ok: true, skipped: true };

  const userId = payment.metadata?.userId;
  const idempotencyKey = payment.metadata?.idempotencyKey;
  if (!userId || !idempotencyKey) throw new Error("MISSING_METADATA");

  await finalizePendingDeposit(idempotencyKey, userId);
  return { ok: true };
}

export async function createPaymentRequest(input: {
  fromUserId: string;
  toUserId?: string | null;
  amountCents: number;
  description: string;
  expiresInHours?: number;
}) {
  if (input.amountCents < 1) throw new Error("INVALID_AMOUNT");

  const pr = await db.paymentRequest.create({
    data: {
      publicId: createPaymentRequestPublicId(),
      fromUserId: input.fromUserId,
      toUserId: input.toUserId ?? null,
      amountCents: input.amountCents,
      description: input.description,
      shareToken: createShareToken(),
      expiresAt: input.expiresInHours
        ? new Date(Date.now() + input.expiresInHours * 3600_000)
        : new Date(Date.now() + 72 * 3600_000),
    },
    include: {
      fromUser: {
        select: {
          profile: {
            select: { displayName: true, username: true, avatarUrl: true },
          },
        },
      },
    },
  });

  if (input.toUserId) {
    await db.notification.create({
      data: {
        userId: input.toUserId,
        type: "payment_request",
        title: "Payment request",
        body: input.description,
        href: `/wallet/pay/${pr.shareToken}`,
      },
    });
  }

  return pr;
}

export async function payPaymentRequest(input: {
  payerUserId: string;
  shareToken: string;
  idempotencyKey: string;
  pin?: string;
}) {
  const pr = await db.paymentRequest.findUnique({
    where: { shareToken: input.shareToken },
    include: {
      fromUser: {
        include: { wallet: true, profile: true },
      },
    },
  });
  if (!pr) throw new Error("REQUEST_NOT_FOUND");
  if (pr.status !== "pending") throw new Error("REQUEST_NOT_PAYABLE");
  if (pr.expiresAt && pr.expiresAt < new Date()) {
    await db.paymentRequest.update({
      where: { id: pr.id },
      data: { status: "expired" },
    });
    throw new Error("REQUEST_EXPIRED");
  }
  if (pr.fromUserId === input.payerUserId) throw new Error("CANNOT_PAY_SELF");

  const recipientWallet = pr.fromUser.wallet?.walletId;
  if (!recipientWallet) throw new Error("RECIPIENT_WALLET_MISSING");

  const tx = await transferBetweenWallets({
    fromUserId: input.payerUserId,
    toWalletQuery: recipientWallet,
    amountCents: pr.amountCents,
    notes: pr.description,
    idempotencyKey: input.idempotencyKey,
    pin: input.pin,
  });

  await db.paymentRequest.update({
    where: { id: pr.id },
    data: {
      status: "paid",
      paidAt: new Date(),
      paidTransactionId: tx.id,
      toUserId: input.payerUserId,
    },
  });

  await db.financialTransaction.update({
    where: { id: tx.id },
    data: { paymentRequestId: pr.id, type: "payment_request" },
  });

  await db.notification.create({
    data: {
      userId: pr.fromUserId,
      type: "payment_completed",
      title: "Payment received",
      body: pr.description,
      href: "/wallet",
    },
  });

  return { transaction: tx, paymentRequest: pr };
}

export function getFuturePaymentMethods() {
  return FUTURE_METHODS.map((m) => ({
    id: m,
    enabled: false,
    status: "architecture_ready" as const,
  }));
}
