import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listRecentNotifications(input: {
  userId?: string;
  type?: string;
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (input.userId) where.userId = input.userId;
  if (input.type) where.type = input.type;
  if (input.unreadOnly) where.readAt = null;

  const [items, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } },
      },
    }),
    db.notification.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getNotificationStats() {
  const [total, unread, today, topTypes] = await Promise.all([
    db.notification.count(),
    db.notification.count({ where: { readAt: null } }),
    db.notification.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    db.notification.groupBy({
      by: ["type"],
      _count: { _all: true },
      orderBy: { _count: { type: "desc" } },
      take: 10,
    }),
  ]);
  return { total, unread, today, topTypes };
}

export async function clearOldNotifications(adminId: string, olderThanDays: number) {
  const cutoff = new Date(Date.now() - olderThanDays * 86400000);
  const result = await db.notification.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  await writeAdminAudit({
    adminId,
    action: "notifications.purge",
    entityType: "Notification",
    newValue: { deleted: result.count, olderThanDays },
  });
  return result.count;
}
