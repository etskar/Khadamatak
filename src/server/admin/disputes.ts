import "server-only";
import { db } from "@/lib/db";
import { resolveDispute } from "@/server/finance/escrow-service";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listDisputes(input: {
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
      { escrow: { is: { publicId: { contains: input.query } } } },
    ];
  }

  const [items, total] = await Promise.all([
    db.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        escrow: {
          include: {
            buyer: { include: { profile: { select: { displayName: true, username: true } } } },
            seller: { include: { profile: { select: { displayName: true, username: true } } } },
          },
        },
        openedBy: { include: { profile: { select: { displayName: true, username: true } } } },
        _count: { select: { messages: true, evidence: true } },
      },
    }),
    db.dispute.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getDisputeDetail(publicId: string) {
  return db.dispute.findUnique({
    where: { publicId },
    include: {
      escrow: {
        include: {
          buyer: { include: { profile: true } },
          seller: { include: { profile: true } },
          events: { orderBy: { createdAt: "asc" } },
          transactions: true,
        },
      },
      openedBy: { include: { profile: true } },
      messages: { orderBy: { createdAt: "asc" } },
      evidence: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function postDisputeMessage(input: {
  adminId: string;
  disputePublicId: string;
  content: string;
}) {
  const dispute = await db.dispute.findUnique({ where: { publicId: input.disputePublicId } });
  if (!dispute) throw new Error("DISPUTE_NOT_FOUND");

  const message = await db.disputeMessage.create({
    data: {
      disputeId: dispute.id,
      authorId: input.adminId,
      content: input.content,
    },
  });
  await db.disputeEvent.create({
    data: {
      disputeId: dispute.id,
      actorId: input.adminId,
      type: "admin_message",
      message: input.content.slice(0, 200),
    },
  });
  return message;
}

export async function adminResolveDispute(input: {
  adminId: string;
  disputePublicId: string;
  decision: "refund" | "release";
  resolution: string;
}) {
  const result = await resolveDispute({
    disputePublicId: input.disputePublicId,
    adminId: input.adminId,
    decision: input.decision,
    resolution: input.resolution,
    idempotencyKey: `admin-resolve-${input.disputePublicId}-${input.adminId}-${Date.now()}`,
  });

  // Sync linked order status
  const dispute = await db.dispute.findUnique({
    where: { publicId: input.disputePublicId },
    include: { escrow: true },
  });
  const order = dispute?.escrow ? await db.marketOrder.findUnique({ where: { escrowId: dispute.escrow.id } }) : null;
  if (order) {
    await db.marketOrder.update({
      where: { id: order.id },
      data: input.decision === "refund"
        ? { status: "refunded", paymentStatus: "refunded", deliveryStatus: "cancelled" }
        : { status: "completed", paymentStatus: "released", deliveryStatus: "completed", completedAt: new Date() },
    });
  }

  await writeAdminAudit({
    adminId: input.adminId,
    action: `dispute.resolve.${input.decision}`,
    entityType: "Dispute",
    entityId: dispute?.id,
    newValue: { resolution: input.resolution },
  });
  return result;
}

export async function closeDispute(input: {
  adminId: string;
  disputePublicId: string;
  note: string;
}) {
  const dispute = await db.dispute.findUnique({ where: { publicId: input.disputePublicId } });
  if (!dispute) throw new Error("DISPUTE_NOT_FOUND");

  const updated = await db.dispute.update({
    where: { id: dispute.id },
    data: { status: "closed", resolution: input.note, resolvedById: input.adminId, resolvedAt: new Date() },
  });
  await db.disputeEvent.create({
    data: { disputeId: dispute.id, actorId: input.adminId, type: "closed", message: input.note },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "dispute.close",
    entityType: "Dispute",
    entityId: dispute.id,
    newValue: { note: input.note },
  });
  return updated;
}

export async function requestDisputeEvidence(input: {
  adminId: string;
  disputePublicId: string;
  note: string;
}) {
  const dispute = await db.dispute.findUnique({ where: { publicId: input.disputePublicId } });
  if (!dispute) throw new Error("DISPUTE_NOT_FOUND");

  await db.dispute.update({
    where: { id: dispute.id },
    data: { status: "under_review" },
  });
  await db.disputeMessage.create({
    data: { disputeId: dispute.id, authorId: input.adminId, content: input.note },
  });
  await db.disputeEvent.create({
    data: { disputeId: dispute.id, actorId: input.adminId, type: "evidence_requested", message: input.note },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "dispute.request_evidence",
    entityType: "Dispute",
    entityId: dispute.id,
    newValue: { note: input.note },
  });
  return { ok: true };
}
