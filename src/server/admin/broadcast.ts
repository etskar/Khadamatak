import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listBroadcasts(input: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = input.status ? { status: input.status } : {};

  const [items, total] = await Promise.all([
    db.broadcast.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { deliveries: true } } },
    }),
    db.broadcast.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getBroadcastStats(id: string) {
  const broadcast = await db.broadcast.findUnique({ where: { id } });
  if (!broadcast) return null;

  const [delivered, read, failed] = await Promise.all([
    db.broadcastDelivery.count({ where: { broadcastId: id, status: "delivered" } }),
    db.broadcastDelivery.count({ where: { broadcastId: id, status: "read" } }),
    db.broadcastDelivery.count({ where: { broadcastId: id, status: "failed" } }),
  ]);
  return { total: delivered + read + failed, delivered, read, failed };
}

export async function createBroadcast(input: {
  adminId: string;
  type: string;
  audience: string;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  scheduledAt?: string;
}) {
  const broadcast = await db.broadcast.create({
    data: {
      publicId: `KH-BC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      type: input.type,
      audience: input.audience,
      title: input.title,
      titleAr: input.titleAr,
      body: input.body,
      bodyAr: input.bodyAr,
      status: input.scheduledAt ? "scheduled" : "draft",
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      createdById: input.adminId,
    },
  });
  return broadcast;
}

export async function sendBroadcast(adminId: string, id: string) {
  const broadcast = await db.broadcast.findUnique({ where: { id } });
  if (!broadcast) throw new Error("BROADCAST_NOT_FOUND");
  if (broadcast.status === "sent") throw new Error("ALREADY_SENT");

  const where: Record<string, unknown> = {};
  if (broadcast.audience === "verified") where.verification = { is: { status: "verified" } };
  if (broadcast.audience === "sellers") where.products = { some: {} };
  if (broadcast.audience === "buyers") where.ordersAsBuyer = { some: {} };
  if (broadcast.audience === "communities") where.groupMemberships = { some: { status: "active" } };

  const users = await db.user.findMany({
    where,
    select: { id: true },
  });

  await db.$transaction(async (tx) => {
    for (const user of users) {
      await tx.notification.create({
        data: {
          userId: user.id,
          type: "broadcast",
          title: broadcast.titleAr ?? broadcast.title,
          body: broadcast.bodyAr ?? broadcast.body,
          href: "/notifications",
          dataJson: JSON.stringify({ broadcastId: broadcast.id }),
        },
      });
      await tx.broadcastDelivery.upsert({
        where: {
          broadcastId_userId: { broadcastId: broadcast.id, userId: user.id },
        },
        create: { broadcastId: broadcast.id, userId: user.id, channel: broadcast.type },
        update: {},
      });
    }
  });

  const updated = await db.broadcast.update({
    where: { id },
    data: { status: "sent", sentAt: new Date() },
  });

  await writeAdminAudit({
    adminId,
    action: "notifications.broadcast_sent",
    entityType: "Broadcast",
    entityId: id,
    newValue: { recipients: users.length },
    metadata: { audience: broadcast.audience },
  });
  return updated;
}

export async function cancelBroadcast(adminId: string, id: string) {
  const broadcast = await db.broadcast.findUnique({ where: { id } });
  if (!broadcast) throw new Error("BROADCAST_NOT_FOUND");
  if (broadcast.status === "sent") throw new Error("ALREADY_SENT");
  const updated = await db.broadcast.update({ where: { id }, data: { status: "cancelled" } });
  await writeAdminAudit({
    adminId,
    action: "notifications.broadcast_cancelled",
    entityType: "Broadcast",
    entityId: id,
  });
  return updated;
}

export async function deleteBroadcast(adminId: string, id: string) {
  await db.broadcast.delete({ where: { id } });
  await writeAdminAudit({
    adminId,
    action: "notifications.broadcast_deleted",
    entityType: "Broadcast",
    entityId: id,
  });
  return { ok: true };
}
