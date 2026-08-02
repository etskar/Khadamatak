import "server-only";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { createDisputePublicId, createEscrowPublicId } from "@/lib/ids";
import {
  completeTransaction,
  createFinancialTransaction,
  creditWallet,
  debitWallet,
  moveBetweenBuckets,
} from "@/server/finance/ledger";

async function assertVerified(userId: string) {
  const v = await db.identityVerification.findUnique({ where: { userId } });
  if (!v || v.status !== "verified") {
    throw new Error("VERIFICATION_REQUIRED");
  }
}

export async function createEscrow(input: {
  buyerId: string;
  sellerId: string;
  amountCents: number;
  description?: string;
  idempotencyKey: string;
  orderRef?: string;
}) {
  if (input.buyerId === input.sellerId) throw new Error("INVALID_PARTIES");
  if (input.amountCents < 1) throw new Error("INVALID_AMOUNT");
  await assertVerified(input.buyerId);
  await assertVerified(input.sellerId);

  const buyerWallet = await db.wallet.findUnique({ where: { userId: input.buyerId } });
  const sellerWallet = await db.wallet.findUnique({ where: { userId: input.sellerId } });
  if (!buyerWallet || !sellerWallet) throw new Error("WALLET_NOT_FOUND");

  const result = await db.$transaction(async (tx) => {
    const escrow = await tx.escrow.create({
      data: {
        publicId: createEscrowPublicId(),
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        amountCents: input.amountCents,
        description: input.description,
        orderRef: input.orderRef,
        status: "created",
        autoReleaseAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    const { transaction } = await createFinancialTransaction({
      tx,
      idempotencyKey: input.idempotencyKey,
      type: "escrow_lock",
      amountCents: input.amountCents,
      fromWalletId: buyerWallet.id,
      toWalletId: buyerWallet.id,
      actorUserId: input.buyerId,
      counterpartyUserId: input.sellerId,
      paymentMethod: "wallet",
      provider: "internal",
      escrowId: escrow.id,
      status: "processing",
      notes: "Escrow fund lock",
    });

    // Lock buyer funds: available -> frozen (platform escrow hold on buyer wallet)
    await moveBetweenBuckets({
      tx,
      walletId: buyerWallet.id,
      amountCents: input.amountCents,
      from: "available",
      to: "frozen",
      transactionId: transaction.id,
      description: `Escrow lock ${escrow.publicId}`,
    });

    await completeTransaction(tx, transaction.id, "completed");

    await tx.escrow.update({
      where: { id: escrow.id },
      data: { status: "funded", fundedAt: new Date() },
    });

    await tx.escrowEvent.create({
      data: {
        escrowId: escrow.id,
        actorId: input.buyerId,
        type: "funded",
        message: "Funds locked in escrow",
      },
    });

    return tx.escrow.findUniqueOrThrow({ where: { id: escrow.id } });
  });

  await db.notification.createMany({
    data: [
      {
        userId: input.sellerId,
        type: "escrow_update",
        title: "Escrow funded",
        body: "A buyer locked funds in escrow for your delivery.",
        href: `/wallet/escrow/${result.publicId}`,
      },
      {
        userId: input.buyerId,
        type: "escrow_update",
        title: "Escrow created",
        body: "Your payment is securely locked until delivery confirmation.",
        href: `/wallet/escrow/${result.publicId}`,
      },
    ],
  });

  await writeAuditLog({
    actorUserId: input.buyerId,
    action: "escrow.funded",
    entityType: "Escrow",
    entityId: result.id,
    metadata: { amountCents: input.amountCents, sellerId: input.sellerId },
  });

  return result;
}

export async function markEscrowDelivered(input: {
  escrowPublicId: string;
  sellerId: string;
}) {
  const escrow = await db.escrow.findUnique({ where: { publicId: input.escrowPublicId } });
  if (!escrow) throw new Error("ESCROW_NOT_FOUND");
  if (escrow.sellerId !== input.sellerId) throw new Error("FORBIDDEN");
  if (escrow.status !== "funded") throw new Error("INVALID_STATUS");

  const updated = await db.escrow.update({
    where: { id: escrow.id },
    data: { status: "delivered", deliveredAt: new Date() },
  });

  await db.escrowEvent.create({
    data: {
      escrowId: escrow.id,
      actorId: input.sellerId,
      type: "delivered",
      message: "Seller marked as delivered",
    },
  });

  await db.notification.create({
    data: {
      userId: escrow.buyerId,
      type: "escrow_update",
      title: "Delivery marked",
      body: "Seller marked the order as delivered. Please confirm.",
      href: `/wallet/escrow/${escrow.publicId}`,
    },
  });

  return updated;
}

export async function confirmEscrowDelivery(input: {
  escrowPublicId: string;
  buyerId: string;
  idempotencyKey: string;
}) {
  const escrow = await db.escrow.findUnique({ where: { publicId: input.escrowPublicId } });
  if (!escrow) throw new Error("ESCROW_NOT_FOUND");
  if (escrow.buyerId !== input.buyerId) throw new Error("FORBIDDEN");
  if (escrow.status !== "funded" && escrow.status !== "delivered") {
    throw new Error("INVALID_STATUS");
  }

  const buyerWallet = await db.wallet.findUnique({ where: { userId: escrow.buyerId } });
  const sellerWallet = await db.wallet.findUnique({ where: { userId: escrow.sellerId } });
  if (!buyerWallet || !sellerWallet) throw new Error("WALLET_NOT_FOUND");

  const result = await db.$transaction(async (tx) => {
    const current = await tx.escrow.findUnique({ where: { id: escrow.id } });
    if (!current) throw new Error("ESCROW_NOT_FOUND");
    if (current.status === "completed") return current;
    if (current.status !== "funded" && current.status !== "delivered") {
      throw new Error("INVALID_STATUS");
    }

    const { transaction, replayed } = await createFinancialTransaction({
      tx,
      idempotencyKey: input.idempotencyKey,
      type: "escrow_release",
      amountCents: escrow.amountCents,
      fromWalletId: buyerWallet.id,
      toWalletId: sellerWallet.id,
      actorUserId: input.buyerId,
      counterpartyUserId: escrow.sellerId,
      paymentMethod: "wallet",
      provider: "internal",
      escrowId: escrow.id,
      status: "processing",
    });

    if (replayed) {
      return tx.escrow.findUniqueOrThrow({ where: { id: escrow.id } });
    }

    // Release: debit buyer frozen, credit seller available
    await debitWallet({
      tx,
      walletId: buyerWallet.id,
      amountCents: escrow.amountCents,
      bucket: "frozen",
      transactionId: transaction.id,
      description: `Escrow release ${escrow.publicId}`,
    });
    await creditWallet({
      tx,
      walletId: sellerWallet.id,
      amountCents: escrow.amountCents,
      bucket: "available",
      transactionId: transaction.id,
      description: `Escrow payout ${escrow.publicId}`,
    });

    await completeTransaction(tx, transaction.id, "completed");

    const updated = await tx.escrow.update({
      where: { id: escrow.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        releasedAt: new Date(),
      },
    });

    await tx.escrowEvent.create({
      data: {
        escrowId: escrow.id,
        actorId: input.buyerId,
        type: "released",
        message: "Buyer confirmed delivery — funds released to seller",
      },
    });

    return updated;
  });

  await db.notification.createMany({
    data: [
      {
        userId: escrow.sellerId,
        type: "escrow_update",
        title: "Funds released",
        body: "Buyer confirmed delivery. Escrow funds are now in your wallet.",
        href: "/wallet",
      },
      {
        userId: escrow.buyerId,
        type: "escrow_update",
        title: "Escrow completed",
        body: "You confirmed delivery. Funds were released to the seller.",
        href: `/wallet/escrow/${escrow.publicId}`,
      },
    ],
  });

  await writeAuditLog({
    actorUserId: input.buyerId,
    action: "escrow.released",
    entityType: "Escrow",
    entityId: escrow.id,
  });

  return result;
}

export async function openDispute(input: {
  escrowPublicId: string;
  openerId: string;
  reason: string;
}) {
  const escrow = await db.escrow.findUnique({ where: { publicId: input.escrowPublicId } });
  if (!escrow) throw new Error("ESCROW_NOT_FOUND");
  if (escrow.buyerId !== input.openerId && escrow.sellerId !== input.openerId) {
    throw new Error("FORBIDDEN");
  }
  if (!["funded", "delivered"].includes(escrow.status)) {
    throw new Error("INVALID_STATUS");
  }

  const existing = await db.dispute.findUnique({ where: { escrowId: escrow.id } });
  if (existing) throw new Error("DISPUTE_EXISTS");

  const dispute = await db.$transaction(async (tx) => {
    await tx.escrow.update({
      where: { id: escrow.id },
      data: { status: "disputed", disputedAt: new Date() },
    });

    const d = await tx.dispute.create({
      data: {
        publicId: createDisputePublicId(),
        escrowId: escrow.id,
        openedById: input.openerId,
        reason: input.reason,
        status: "open",
      },
    });

    await tx.disputeEvent.create({
      data: {
        disputeId: d.id,
        actorId: input.openerId,
        type: "opened",
        message: input.reason,
      },
    });

    await tx.escrowEvent.create({
      data: {
        escrowId: escrow.id,
        actorId: input.openerId,
        type: "disputed",
        message: input.reason,
      },
    });

    return d;
  });

  const otherId = escrow.buyerId === input.openerId ? escrow.sellerId : escrow.buyerId;
  await db.notification.createMany({
    data: [
      {
        userId: otherId,
        type: "dispute_update",
        title: "Dispute opened",
        body: "An escrow dispute was opened. Please review.",
        href: `/wallet/disputes/${dispute.publicId}`,
      },
      {
        userId: input.openerId,
        type: "dispute_update",
        title: "Dispute submitted",
        body: "Your dispute is under review.",
        href: `/wallet/disputes/${dispute.publicId}`,
      },
    ],
  });

  return dispute;
}

export async function resolveDispute(input: {
  disputePublicId: string;
  adminId: string;
  decision: "refund" | "release";
  resolution: string;
  idempotencyKey: string;
}) {
  const dispute = await db.dispute.findUnique({
    where: { publicId: input.disputePublicId },
    include: { escrow: true },
  });
  if (!dispute) throw new Error("DISPUTE_NOT_FOUND");
  if (!["open", "under_review"].includes(dispute.status)) {
    throw new Error("INVALID_STATUS");
  }

  const escrow = dispute.escrow;
  const buyerWallet = await db.wallet.findUnique({ where: { userId: escrow.buyerId } });
  const sellerWallet = await db.wallet.findUnique({ where: { userId: escrow.sellerId } });
  if (!buyerWallet || !sellerWallet) throw new Error("WALLET_NOT_FOUND");

  const result = await db.$transaction(async (tx) => {
    const { transaction, replayed } = await createFinancialTransaction({
      tx,
      idempotencyKey: input.idempotencyKey,
      type: input.decision === "refund" ? "escrow_refund" : "escrow_release",
      amountCents: escrow.amountCents,
      fromWalletId: buyerWallet.id,
      toWalletId: input.decision === "refund" ? buyerWallet.id : sellerWallet.id,
      actorUserId: input.adminId,
      counterpartyUserId:
        input.decision === "refund" ? escrow.buyerId : escrow.sellerId,
      paymentMethod: "wallet",
      provider: "internal",
      escrowId: escrow.id,
      status: "processing",
      notes: input.resolution,
    });

    if (replayed) {
      return tx.dispute.findUniqueOrThrow({ where: { id: dispute.id } });
    }

    await debitWallet({
      tx,
      walletId: buyerWallet.id,
      amountCents: escrow.amountCents,
      bucket: "frozen",
      transactionId: transaction.id,
      description: `Dispute ${input.decision} ${escrow.publicId}`,
    });

    if (input.decision === "refund") {
      await creditWallet({
        tx,
        walletId: buyerWallet.id,
        amountCents: escrow.amountCents,
        bucket: "available",
        transactionId: transaction.id,
        description: `Escrow refund ${escrow.publicId}`,
      });
    } else {
      await creditWallet({
        tx,
        walletId: sellerWallet.id,
        amountCents: escrow.amountCents,
        bucket: "available",
        transactionId: transaction.id,
        description: `Escrow release ${escrow.publicId}`,
      });
    }

    await completeTransaction(tx, transaction.id, "completed");

    await tx.escrow.update({
      where: { id: escrow.id },
      data: {
        status: input.decision === "refund" ? "refunded" : "completed",
        refundedAt: input.decision === "refund" ? new Date() : null,
        releasedAt: input.decision === "release" ? new Date() : null,
        completedAt: new Date(),
      },
    });

    const updated = await tx.dispute.update({
      where: { id: dispute.id },
      data: {
        status: input.decision === "refund" ? "resolved_refund" : "resolved_release",
        resolution: input.resolution,
        resolvedById: input.adminId,
        resolvedAt: new Date(),
      },
    });

    await tx.disputeEvent.create({
      data: {
        disputeId: dispute.id,
        actorId: input.adminId,
        type: `resolved_${input.decision}`,
        message: input.resolution,
      },
    });

    return updated;
  });

  await db.notification.createMany({
    data: [
      {
        userId: escrow.buyerId,
        type: "dispute_update",
        title: "Dispute resolved",
        body: input.resolution,
        href: `/wallet/disputes/${dispute.publicId}`,
      },
      {
        userId: escrow.sellerId,
        type: "dispute_update",
        title: "Dispute resolved",
        body: input.resolution,
        href: `/wallet/disputes/${dispute.publicId}`,
      },
    ],
  });

  await writeAuditLog({
    actorUserId: input.adminId,
    action: `dispute.resolve.${input.decision}`,
    entityType: "Dispute",
    entityId: dispute.id,
  });

  return result;
}
