import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";
import { adminReleaseEscrow, adminRefundEscrow } from "@/server/admin/escrow";

export async function listOrders(input: {
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
      { product: { is: { title: { contains: input.query } } } },
      { service: { is: { title: { contains: input.query } } } },
    ];
  }

  const [items, total] = await Promise.all([
    db.marketOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        buyer: { include: { profile: { select: { displayName: true, username: true } } } },
        seller: { include: { profile: { select: { displayName: true, username: true } } } },
        product: { select: { title: true } },
        service: { select: { title: true } },
        escrow: { select: { publicId: true, status: true } },
      },
    }),
    db.marketOrder.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getOrderDetail(publicId: string) {
  return db.marketOrder.findUnique({
    where: { publicId },
    include: {
      buyer: { include: { profile: true, wallet: true } },
      seller: { include: { profile: true, wallet: true } },
      product: { include: { media: true } },
      service: { include: { media: true } },
      escrow: true,
      invoice: true,
      review: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function adminCompleteOrder(input: {
  adminId: string;
  orderPublicId: string;
  note: string;
}) {
  const order = await db.marketOrder.findUnique({
    where: { publicId: input.orderPublicId },
    include: { escrow: true },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status === "completed") throw new Error("ALREADY_COMPLETED");

  if (order.escrow && order.escrow.status !== "completed") {
    await adminReleaseEscrow({
      adminId: input.adminId,
      escrowPublicId: order.escrow.publicId,
      reason: `Order completed by admin: ${input.note}`,
    });
  }

  const updated = await db.marketOrder.update({
    where: { id: order.id },
    data: {
      status: "completed",
      deliveryStatus: "completed",
      paymentStatus: "released",
      completedAt: new Date(),
    },
  });
  await db.orderEvent.create({
    data: { orderId: order.id, actorId: input.adminId, type: "admin_completed", message: input.note },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "order.admin_complete",
    entityType: "MarketOrder",
    entityId: order.id,
    newValue: { note: input.note },
  });
  return updated;
}

export async function adminCancelOrder(input: {
  adminId: string;
  orderPublicId: string;
  note: string;
}) {
  const order = await db.marketOrder.findUnique({
    where: { publicId: input.orderPublicId },
    include: { escrow: true },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (["completed", "refunded", "cancelled"].includes(order.status)) {
    throw new Error("INVALID_STATUS");
  }

  if (order.escrow && ["funded", "delivered", "frozen"].includes(order.escrow.status)) {
    await adminRefundEscrow({
      adminId: input.adminId,
      escrowPublicId: order.escrow.publicId,
      reason: `Order cancelled by admin: ${input.note}`,
    });
  }

  const updated = await db.marketOrder.update({
    where: { id: order.id },
    data: {
      status: "cancelled",
      deliveryStatus: "cancelled",
      paymentStatus: order.escrow ? "refunded" : "cancelled",
      cancelledAt: new Date(),
    },
  });
  await db.orderEvent.create({
    data: { orderId: order.id, actorId: input.adminId, type: "admin_cancelled", message: input.note },
  });
  await db.notification.createMany({
    data: [
      { userId: order.buyerId, type: "order", title: "Order cancelled", body: input.note, href: `/orders/${order.publicId}` },
      { userId: order.sellerId, type: "order", title: "Order cancelled", body: input.note, href: `/orders/${order.publicId}` },
    ],
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "order.admin_cancel",
    entityType: "MarketOrder",
    entityId: order.id,
    newValue: { note: input.note },
  });
  return updated;
}

export async function adminForceRefund(input: {
  adminId: string;
  orderPublicId: string;
  note: string;
}) {
  const order = await db.marketOrder.findUnique({
    where: { publicId: input.orderPublicId },
    include: { escrow: true },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (["completed", "refunded"].includes(order.status)) throw new Error("INVALID_STATUS");

  if (order.escrow && ["funded", "delivered", "frozen"].includes(order.escrow.status)) {
    await adminRefundEscrow({
      adminId: input.adminId,
      escrowPublicId: order.escrow.publicId,
      reason: `Force refund by admin: ${input.note}`,
    });
  }

  const updated = await db.marketOrder.update({
    where: { id: order.id },
    data: { status: "refunded", deliveryStatus: "cancelled", paymentStatus: "refunded", cancelledAt: new Date() },
  });
  await db.orderEvent.create({
    data: { orderId: order.id, actorId: input.adminId, type: "admin_refunded", message: input.note },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "order.admin_force_refund",
    entityType: "MarketOrder",
    entityId: order.id,
    newValue: { note: input.note },
  });
  return updated;
}

export async function adminForceRelease(input: {
  adminId: string;
  orderPublicId: string;
  note: string;
}) {
  const order = await db.marketOrder.findUnique({
    where: { publicId: input.orderPublicId },
    include: { escrow: true },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (!order.escrow) throw new Error("ESCROW_MISSING");

  await adminReleaseEscrow({
    adminId: input.adminId,
    escrowPublicId: order.escrow.publicId,
    reason: `Force release by admin: ${input.note}`,
  });

  const updated = await db.marketOrder.update({
    where: { id: order.id },
    data: { status: "completed", deliveryStatus: "completed", paymentStatus: "released", completedAt: new Date() },
  });
  await db.orderEvent.create({
    data: { orderId: order.id, actorId: input.adminId, type: "admin_force_release", message: input.note },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "order.admin_force_release",
    entityType: "MarketOrder",
    entityId: order.id,
    newValue: { note: input.note },
  });
  return updated;
}
