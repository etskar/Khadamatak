import "server-only";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { createWalletPublicId } from "@/lib/ids";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import {
  completeTransaction,
  createFinancialTransaction,
  creditWallet,
  debitWallet,
} from "@/server/finance/ledger";
import { sha256 } from "@/lib/crypto";

export async function ensureWalletForUser(userId: string, username: string) {
  const existing = await db.wallet.findUnique({ where: { userId } });
  if (existing) return existing;

  let walletUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  if (!walletUsername) walletUsername = `user${userId.slice(-6)}`;

  // uniqueness retry
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? walletUsername : `${walletUsername}${i}`;
    const taken = await db.wallet.findUnique({ where: { walletUsername: candidate } });
    if (!taken) {
      return db.wallet.create({
        data: {
          userId,
          walletId: createWalletPublicId(),
          walletUsername: candidate,
        },
      });
    }
  }

  return db.wallet.create({
    data: {
      userId,
      walletId: createWalletPublicId(),
      walletUsername: `w${Date.now().toString(36)}`,
    },
  });
}

export async function getWalletByUserId(userId: string) {
  return db.wallet.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { displayName: true, username: true, avatarUrl: true } },
        },
      },
    },
  });
}

export async function resolveWalletRecipient(query: string) {
  const q = query.trim();
  if (!q) return null;

  const wallet = await db.wallet.findFirst({
    where: {
      OR: [
        { walletId: q.toUpperCase() },
        { walletUsername: q.toLowerCase().replace(/^@/, "") },
        { user: { profile: { username: q.toLowerCase().replace(/^@/, "") } } },
      ],
      status: "active",
    },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { displayName: true, username: true, avatarUrl: true } },
        },
      },
    },
  });

  return wallet;
}

export async function transferBetweenWallets(input: {
  fromUserId: string;
  toWalletQuery: string;
  amountCents: number;
  notes?: string;
  idempotencyKey: string;
  pin?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  if (input.amountCents < 1) throw new Error("INVALID_AMOUNT");
  if (input.amountCents > 1_000_000_00) throw new Error("AMOUNT_TOO_LARGE");

  const fromWallet = await db.wallet.findUnique({ where: { userId: input.fromUserId } });
  if (!fromWallet) throw new Error("WALLET_NOT_FOUND");
  if (fromWallet.pinHash) {
    if (!input.pin) throw new Error("PIN_REQUIRED");
    const ok = await verifyPassword(input.pin, fromWallet.pinHash);
    if (!ok) throw new Error("INVALID_PIN");
  }

  const toWallet = await resolveWalletRecipient(input.toWalletQuery);
  if (!toWallet) throw new Error("RECIPIENT_NOT_FOUND");
  if (toWallet.id === fromWallet.id) throw new Error("CANNOT_TRANSFER_TO_SELF");

  // Idempotency pre-check
  const existing = await db.financialTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing?.status === "completed") return existing;

  const result = await db.$transaction(async (tx) => {
    const { transaction, replayed } = await createFinancialTransaction({
      tx,
      idempotencyKey: input.idempotencyKey,
      type: "transfer",
      amountCents: input.amountCents,
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      actorUserId: input.fromUserId,
      counterpartyUserId: toWallet.userId,
      paymentMethod: "wallet",
      provider: "internal",
      notes: input.notes,
      status: "processing",
    });

    if (replayed && transaction.status === "completed") {
      return transaction;
    }

    await debitWallet({
      tx,
      walletId: fromWallet.id,
      amountCents: input.amountCents,
      bucket: "available",
      transactionId: transaction.id,
      description: `Transfer to ${toWallet.walletId}`,
    });
    await creditWallet({
      tx,
      walletId: toWallet.id,
      amountCents: input.amountCents,
      bucket: "available",
      transactionId: transaction.id,
      description: `Transfer from ${fromWallet.walletId}`,
    });

    return completeTransaction(tx, transaction.id, "completed");
  });

  await writeAuditLog({
    actorUserId: input.fromUserId,
    action: "wallet.transfer",
    entityType: "FinancialTransaction",
    entityId: result.id,
    transactionId: result.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      amountCents: input.amountCents,
      toWalletId: toWallet.walletId,
    },
  });

  // notifications
  await db.notification.createMany({
    data: [
      {
        userId: toWallet.userId,
        type: "wallet_transfer",
        title: "Money received",
        body: `You received a transfer of ${(input.amountCents / 100).toFixed(2)} EUR`,
        href: "/wallet",
        dataJson: JSON.stringify({ transactionId: result.id }),
      },
      {
        userId: input.fromUserId,
        type: "wallet_transfer",
        title: "Transfer sent",
        body: `You sent ${(input.amountCents / 100).toFixed(2)} EUR`,
        href: "/wallet",
        dataJson: JSON.stringify({ transactionId: result.id }),
      },
    ],
  });

  return result;
}

export async function setWalletPin(userId: string, pin: string) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error("INVALID_PIN_FORMAT");
  const pinHash = await hashPassword(pin);
  await db.wallet.update({
    where: { userId },
    data: { pinHash },
  });
  await writeAuditLog({
    actorUserId: userId,
    action: "wallet.pin_set",
    entityType: "Wallet",
    entityId: userId,
  });
}

export async function creditDeposit(input: {
  userId: string;
  amountCents: number;
  provider: string;
  providerRef: string;
  paymentMethod: string;
  idempotencyKey: string;
}) {
  const wallet = await db.wallet.findUnique({ where: { userId: input.userId } });
  if (!wallet) throw new Error("WALLET_NOT_FOUND");

  const existing = await db.financialTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing?.status === "completed") return existing;

  const result = await db.$transaction(async (tx) => {
    const { transaction, replayed } = await createFinancialTransaction({
      tx,
      idempotencyKey: input.idempotencyKey,
      type: "deposit",
      amountCents: input.amountCents,
      toWalletId: wallet.id,
      actorUserId: input.userId,
      paymentMethod: input.paymentMethod,
      provider: input.provider,
      providerRef: input.providerRef,
      status: "processing",
    });

    if (replayed && transaction.status === "completed") return transaction;

    // move from pending if was pending, else direct credit available
    if (transaction.status === "pending") {
      // pending deposits use pending bucket first
    }

    await creditWallet({
      tx,
      walletId: wallet.id,
      amountCents: input.amountCents,
      bucket: "available",
      transactionId: transaction.id,
      description: `Deposit via ${input.paymentMethod}`,
    });

    // clear pending if any matching pending deposit
    const pendingWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
    if (pendingWallet && pendingWallet.pendingCents >= input.amountCents) {
      await debitWallet({
        tx,
        walletId: wallet.id,
        amountCents: input.amountCents,
        bucket: "pending",
        transactionId: transaction.id,
        description: "Clear pending deposit",
      });
    }

    return completeTransaction(tx, transaction.id, "completed");
  });

  await db.notification.create({
    data: {
      userId: input.userId,
      type: "wallet_deposit",
      title: "Deposit successful",
      body: `Your wallet was topped up with ${(input.amountCents / 100).toFixed(2)} EUR`,
      href: "/wallet",
    },
  });

  await writeAuditLog({
    actorUserId: input.userId,
    action: "wallet.deposit",
    entityType: "FinancialTransaction",
    entityId: result.id,
    transactionId: result.id,
    metadata: { providerRef: input.providerRef, amountCents: input.amountCents },
  });

  return result;
}

export async function createPendingDeposit(input: {
  userId: string;
  amountCents: number;
  provider: string;
  providerRef: string;
  paymentMethod: string;
  idempotencyKey: string;
}) {
  const wallet = await db.wallet.findUnique({ where: { userId: input.userId } });
  if (!wallet) throw new Error("WALLET_NOT_FOUND");

  return db.$transaction(async (tx) => {
    const { transaction, replayed } = await createFinancialTransaction({
      tx,
      idempotencyKey: input.idempotencyKey,
      type: "deposit",
      amountCents: input.amountCents,
      toWalletId: wallet.id,
      actorUserId: input.userId,
      paymentMethod: input.paymentMethod,
      provider: input.provider,
      providerRef: input.providerRef,
      status: "pending",
    });
    if (replayed) return transaction;

    await creditWallet({
      tx,
      walletId: wallet.id,
      amountCents: input.amountCents,
      bucket: "pending",
      transactionId: transaction.id,
      description: "Pending deposit",
    });

    return transaction;
  });
}

export function buildIdempotencyKey(userId: string, operation: string, payload: string) {
  return sha256(`${userId}:${operation}:${payload}`);
}
