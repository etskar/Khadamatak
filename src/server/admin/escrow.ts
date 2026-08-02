import "server-only";
import { db } from "@/lib/db";
import {
  completeTransaction,
  createFinancialTransaction,
  creditWallet,
  debitWallet,
} from "@/server/finance/ledger";
import { buildIdempotencyKey } from "@/server/finance/wallet-service";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listEscrows(input: {
  status?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;
  if (input.query) {
    where.OR = [
      { publicId: { contains: input.query } },
      { buyer: { is: { profile: { is: { username: { contains: input.query } } } } } },
      { seller: { is: { profile: { is: { username: { contains: input.query } } } } } },
    ];
  }

  const [items, total] = await Promise.all([
    db.escrow.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        buyer: { include: { profile: { select: { displayName: true, username: true } } } },
        seller: { include: { profile: { select: { displayName: true, username: true } } } },
        marketOrder: { select: { publicId: true, status: true } },
        dispute: { select: { publicId: true, status: true } },
        _count: { select: { events: true } },
      },
    }),
    db.escrow.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getEscrowDetail(publicId: string) {
  return db.escrow.findUnique({
    where: { publicId },
    include: {
      buyer: { include: { profile: true, wallet: true } },
      seller: { include: { profile: true, wallet: true } },
      transactions: true,
      events: { orderBy: { createdAt: "asc" } },
      dispute: { include: { messages: { orderBy: { createdAt: "asc" } }, evidence: true, events: true } },
      marketOrder: true,
      deal: true,
    },
  });
}

async function getEscrowWithWallets(publicId: string) {
  const escrow = await db.escrow.findUnique({ where: { publicId } });
  if (!escrow) throw new Error("ESCROW_NOT_FOUND");
  const buyerWallet = await db.wallet.findUnique({ where: { userId: escrow.buyerId } });
  const sellerWallet = await db.wallet.findUnique({ where: { userId: escrow.sellerId } });
  if (!buyerWallet || !sellerWallet) throw new Error("WALLET_NOT_FOUND");
  return { escrow, buyerWallet, sellerWallet };
}

async function moveFrozen(input: {
  escrowId: string;
  buyerWalletId: string;
  sellerWalletId: string;
  amountCents: number;
  decision: "release" | "refund";
  adminId: string;
  reason: string;
}) {
  return db.$transaction(async (tx) => {
    const current = await tx.escrow.findUnique({ where: { id: input.escrowId } });
    if (!current) throw new Error("ESCROW_NOT_FOUND");
    if (["completed", "refunded", "cancelled"].includes(current.status)) {
      throw new Error("INVALID_STATUS");
    }

    const { transaction, replayed } = await createFinancialTransaction({
      tx,
      idempotencyKey: buildIdempotencyKey(
        input.adminId,
        input.decision === "release" ? "admin_escrow_release" : "admin_escrow_refund",
        `${current.publicId}:${current.updatedAt.getTime()}`,
      ),
      type: input.decision === "release" ? "escrow_release" : "escrow_refund",
      amountCents: input.amountCents,
      fromWalletId: input.buyerWalletId,
      toWalletId: input.decision === "release" ? input.sellerWalletId : input.buyerWalletId,
      actorUserId: input.adminId,
      counterpartyUserId: input.decision === "release" ? current.sellerId : current.buyerId,
      paymentMethod: "wallet",
      provider: "internal",
      escrowId: current.id,
      status: "processing",
      notes: input.reason,
    });

    if (replayed) {
      return tx.escrow.findUniqueOrThrow({ where: { id: current.id } });
    }

    await debitWallet({
      tx,
      walletId: input.buyerWalletId,
      amountCents: input.amountCents,
      bucket: "frozen",
      transactionId: transaction.id,
      description: `Admin escrow ${input.decision} ${current.publicId}`,
    });

    await creditWallet({
      tx,
      walletId: input.decision === "release" ? input.sellerWalletId : input.buyerWalletId,
      amountCents: input.amountCents,
      bucket: "available",
      transactionId: transaction.id,
      description: `Admin escrow ${input.decision} ${current.publicId}`,
    });

    await completeTransaction(tx, transaction.id, "completed");

    const updated = await tx.escrow.update({
      where: { id: current.id },
      data: {
        status: input.decision === "release" ? "completed" : "refunded",
        releasedAt: input.decision === "release" ? new Date() : null,
        refundedAt: input.decision === "refund" ? new Date() : null,
        completedAt: new Date(),
        metadataJson: JSON.stringify({
          adminResolved: true,
          adminId: input.adminId,
          reason: input.reason,
        }),
      },
    });

    await tx.escrowEvent.create({
      data: {
        escrowId: current.id,
        actorId: input.adminId,
        type: `admin_${input.decision}`,
        message: input.reason,
      },
    });

    return updated;
  });
}

export async function adminReleaseEscrow(input: {
  adminId: string;
  escrowPublicId: string;
  reason: string;
}) {
  const { escrow, buyerWallet, sellerWallet } = await getEscrowWithWallets(input.escrowPublicId);
  const result = await moveFrozen({
    escrowId: escrow.id,
    buyerWalletId: buyerWallet.id,
    sellerWalletId: sellerWallet.id,
    amountCents: escrow.amountCents,
    decision: "release",
    adminId: input.adminId,
    reason: input.reason,
  });

  // Complete linked order
  const order = await db.marketOrder.findUnique({ where: { escrowId: escrow.id } });
  if (order && !["completed", "refunded", "cancelled"].includes(order.status)) {
    await db.marketOrder.update({
      where: { id: order.id },
      data: { status: "completed", deliveryStatus: "completed", paymentStatus: "released", completedAt: new Date() },
    });
  }

  await db.notification.createMany({
    data: [
      { userId: escrow.sellerId, type: "escrow_update", title: "Escrow released", body: "An administrator released your escrow funds.", href: "/wallet" },
      { userId: escrow.buyerId, type: "escrow_update", title: "Escrow released", body: "An administrator released escrow funds to the seller.", href: "/wallet" },
    ],
  });

  await writeAdminAudit({
    adminId: input.adminId,
    action: "escrow.admin_release",
    entityType: "Escrow",
    entityId: escrow.id,
    newValue: { reason: input.reason },
    metadata: { amountCents: escrow.amountCents },
  });
  return result;
}

export async function adminRefundEscrow(input: {
  adminId: string;
  escrowPublicId: string;
  reason: string;
}) {
  const { escrow, buyerWallet, sellerWallet } = await getEscrowWithWallets(input.escrowPublicId);
  const result = await moveFrozen({
    escrowId: escrow.id,
    buyerWalletId: buyerWallet.id,
    sellerWalletId: sellerWallet.id,
    amountCents: escrow.amountCents,
    decision: "refund",
    adminId: input.adminId,
    reason: input.reason,
  });

  const order = await db.marketOrder.findUnique({ where: { escrowId: escrow.id } });
  if (order && !["completed", "refunded", "cancelled"].includes(order.status)) {
    await db.marketOrder.update({
      where: { id: order.id },
      data: { status: "refunded", deliveryStatus: "cancelled", paymentStatus: "refunded", cancelledAt: new Date() },
    });
  }

  await db.notification.createMany({
    data: [
      { userId: escrow.buyerId, type: "escrow_update", title: "Escrow refunded", body: "An administrator refunded your escrow funds.", href: "/wallet" },
      { userId: escrow.sellerId, type: "escrow_update", title: "Escrow refunded", body: "An administrator refunded the buyer.", href: "/wallet" },
    ],
  });

  await writeAdminAudit({
    adminId: input.adminId,
    action: "escrow.admin_refund",
    entityType: "Escrow",
    entityId: escrow.id,
    newValue: { reason: input.reason },
    metadata: { amountCents: escrow.amountCents },
  });
  return result;
}

export async function freezeEscrow(input: {
  adminId: string;
  escrowPublicId: string;
  reason: string;
}) {
  const escrow = await db.escrow.findUnique({ where: { publicId: input.escrowPublicId } });
  if (!escrow) throw new Error("ESCROW_NOT_FOUND");
  if (!["funded", "delivered"].includes(escrow.status)) throw new Error("INVALID_STATUS");

  await db.escrow.update({
    where: { id: escrow.id },
    data: {
      status: "frozen",
      metadataJson: JSON.stringify({ adminFrozen: true, reason: input.reason, frozenBy: input.adminId }),
    },
  });
  await db.escrowEvent.create({
    data: { escrowId: escrow.id, actorId: input.adminId, type: "admin_frozen", message: input.reason },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "escrow.admin_freeze",
    entityType: "Escrow",
    entityId: escrow.id,
    newValue: { reason: input.reason },
  });
  return { ok: true };
}

export async function unfreezeEscrow(input: {
  adminId: string;
  escrowPublicId: string;
}) {
  const escrow = await db.escrow.findUnique({ where: { publicId: input.escrowPublicId } });
  if (!escrow) throw new Error("ESCROW_NOT_FOUND");
  if (escrow.status !== "frozen") throw new Error("INVALID_STATUS");

  await db.escrow.update({
    where: { id: escrow.id },
    data: {
      status: escrow.deliveredAt ? "delivered" : "funded",
      metadataJson: null,
    },
  });
  await db.escrowEvent.create({
    data: { escrowId: escrow.id, actorId: input.adminId, type: "admin_unfrozen", message: "Unfrozen by administrator" },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "escrow.admin_unfreeze",
    entityType: "Escrow",
    entityId: escrow.id,
  });
  return { ok: true };
}

export async function investigateEscrow(input: {
  adminId: string;
  escrowPublicId: string;
  note: string;
}) {
  const escrow = await db.escrow.findUnique({ where: { publicId: input.escrowPublicId } });
  if (!escrow) throw new Error("ESCROW_NOT_FOUND");
  await db.escrowEvent.create({
    data: { escrowId: escrow.id, actorId: input.adminId, type: "admin_investigate", message: input.note },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "escrow.admin_investigate",
    entityType: "Escrow",
    entityId: escrow.id,
    newValue: { note: input.note },
  });
  return { ok: true };
}
