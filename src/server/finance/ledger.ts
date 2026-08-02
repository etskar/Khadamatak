import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { createTransactionReference } from "@/lib/ids";

export type TxClient = Prisma.TransactionClient;

export type Bucket = "available" | "pending" | "frozen" | "escrow_pool";

type CreateTxInput = {
  tx: TxClient;
  idempotencyKey: string;
  type: string;
  amountCents: number;
  currency?: string;
  fromWalletId?: string | null;
  toWalletId?: string | null;
  actorUserId?: string | null;
  counterpartyUserId?: string | null;
  paymentMethod?: string | null;
  provider?: string | null;
  providerRef?: string | null;
  escrowId?: string | null;
  paymentRequestId?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
};

export async function createFinancialTransaction(input: CreateTxInput) {
  const existing = await input.tx.financialTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return { transaction: existing, replayed: true as const };

  const transaction = await input.tx.financialTransaction.create({
    data: {
      reference: createTransactionReference(),
      idempotencyKey: input.idempotencyKey,
      type: input.type,
      status: input.status ?? "pending",
      amountCents: input.amountCents,
      currency: input.currency ?? "EUR",
      fromWalletId: input.fromWalletId ?? null,
      toWalletId: input.toWalletId ?? null,
      actorUserId: input.actorUserId ?? null,
      counterpartyUserId: input.counterpartyUserId ?? null,
      paymentMethod: input.paymentMethod ?? null,
      provider: input.provider ?? null,
      providerRef: input.providerRef ?? null,
      escrowId: input.escrowId ?? null,
      paymentRequestId: input.paymentRequestId ?? null,
      notes: input.notes ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });

  return { transaction, replayed: false as const };
}

async function lockWallet(tx: TxClient, walletId: string) {
  const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) throw new Error("WALLET_NOT_FOUND");
  if (wallet.status !== "active") throw new Error("WALLET_NOT_ACTIVE");
  return wallet;
}

function bucketField(bucket: Bucket) {
  if (bucket === "available") return "availableCents" as const;
  if (bucket === "pending") return "pendingCents" as const;
  if (bucket === "frozen") return "frozenCents" as const;
  return null;
}

/**
 * Credit a wallet bucket and write an immutable ledger entry.
 * Uses version field for optimistic concurrency inside a serializable-ish transaction.
 */
export async function creditWallet(params: {
  tx: TxClient;
  walletId: string;
  amountCents: number;
  bucket: Exclude<Bucket, "escrow_pool">;
  transactionId: string;
  description?: string;
}) {
  if (params.amountCents <= 0) throw new Error("INVALID_AMOUNT");
  const wallet = await lockWallet(params.tx, params.walletId);
  const field = bucketField(params.bucket);
  if (!field) throw new Error("INVALID_BUCKET");

  const next = wallet[field] + params.amountCents;
  const updated = await params.tx.wallet.updateMany({
    where: { id: wallet.id, version: wallet.version },
    data: {
      [field]: next,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw new Error("CONCURRENCY_CONFLICT");

  await params.tx.ledgerEntry.create({
    data: {
      transactionId: params.transactionId,
      walletId: wallet.id,
      direction: "credit",
      accountBucket: params.bucket,
      amountCents: params.amountCents,
      balanceAfterCents: next,
      description: params.description,
    },
  });

  return next;
}

export async function debitWallet(params: {
  tx: TxClient;
  walletId: string;
  amountCents: number;
  bucket: Exclude<Bucket, "escrow_pool">;
  transactionId: string;
  description?: string;
}) {
  if (params.amountCents <= 0) throw new Error("INVALID_AMOUNT");
  const wallet = await lockWallet(params.tx, params.walletId);
  const field = bucketField(params.bucket);
  if (!field) throw new Error("INVALID_BUCKET");

  if (wallet[field] < params.amountCents) {
    throw new Error("INSUFFICIENT_FUNDS");
  }

  const next = wallet[field] - params.amountCents;
  const updated = await params.tx.wallet.updateMany({
    where: { id: wallet.id, version: wallet.version },
    data: {
      [field]: next,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw new Error("CONCURRENCY_CONFLICT");

  await params.tx.ledgerEntry.create({
    data: {
      transactionId: params.transactionId,
      walletId: wallet.id,
      direction: "debit",
      accountBucket: params.bucket,
      amountCents: params.amountCents,
      balanceAfterCents: next,
      description: params.description,
    },
  });

  return next;
}

/** Move funds between buckets on the same wallet (e.g. available -> frozen). */
export async function moveBetweenBuckets(params: {
  tx: TxClient;
  walletId: string;
  amountCents: number;
  from: Exclude<Bucket, "escrow_pool">;
  to: Exclude<Bucket, "escrow_pool">;
  transactionId: string;
  description?: string;
}) {
  await debitWallet({
    tx: params.tx,
    walletId: params.walletId,
    amountCents: params.amountCents,
    bucket: params.from,
    transactionId: params.transactionId,
    description: params.description ?? `move:${params.from}->${params.to}`,
  });
  // re-read version after first update
  await creditWallet({
    tx: params.tx,
    walletId: params.walletId,
    amountCents: params.amountCents,
    bucket: params.to,
    transactionId: params.transactionId,
    description: params.description ?? `move:${params.from}->${params.to}`,
  });
}

export async function completeTransaction(
  tx: TxClient,
  transactionId: string,
  status: "completed" | "failed" | "cancelled" | "reversed" = "completed",
  failureReason?: string,
) {
  return tx.financialTransaction.update({
    where: { id: transactionId },
    data: {
      status,
      failureReason: failureReason ?? null,
      completedAt: status === "completed" ? new Date() : null,
    },
  });
}
