import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listAnnouncements(input: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = input.status ? { status: input.status } : {};

  const [items, total] = await Promise.all([
    db.announcement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.announcement.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function createAnnouncement(input: {
  adminId: string;
  type: string;
  title: { ar: string; nl: string };
  body: { ar: string; nl: string };
  audience: string;
  scheduledAt?: string;
}) {
  const announcement = await db.announcement.create({
    data: {
      publicId: `KH-AN-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      type: input.type,
      titleJson: JSON.stringify(input.title),
      bodyJson: JSON.stringify(input.body),
      audience: input.audience,
      status: input.scheduledAt ? "scheduled" : "draft",
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      createdById: input.adminId,
    },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "announcement.create",
    entityType: "Announcement",
    entityId: announcement.id,
  });
  return announcement;
}

export async function updateAnnouncement(input: {
  adminId: string;
  id: string;
  title?: { ar: string; nl: string };
  body?: { ar: string; nl: string };
  audience?: string;
  status?: string;
  scheduledAt?: string | null;
}) {
  const existing = await db.announcement.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("ANNOUNCEMENT_NOT_FOUND");

  const updated = await db.announcement.update({
    where: { id: input.id },
    data: {
      ...(input.title ? { titleJson: JSON.stringify(input.title) } : {}),
      ...(input.body ? { bodyJson: JSON.stringify(input.body) } : {}),
      ...(input.audience ? { audience: input.audience } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null } : {}),
    },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "announcement.update",
    entityType: "Announcement",
    entityId: input.id,
    previousValue: { status: existing.status, audience: existing.audience },
    newValue: input,
  });
  return updated;
}

export async function publishAnnouncement(adminId: string, id: string) {
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) throw new Error("ANNOUNCEMENT_NOT_FOUND");

  const updated = await db.announcement.update({
    where: { id },
    data: { status: "published", publishedAt: new Date() },
  });
  await broadcastAnnouncementToUsers(existing);
  await writeAdminAudit({
    adminId,
    action: "announcement.publish",
    entityType: "Announcement",
    entityId: id,
    previousValue: existing.status,
    newValue: "published",
  });
  return updated;
}

export async function deleteAnnouncement(adminId: string, id: string) {
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) throw new Error("ANNOUNCEMENT_NOT_FOUND");
  await db.announcement.delete({ where: { id } });
  await writeAdminAudit({
    adminId,
    action: "announcement.delete",
    entityType: "Announcement",
    entityId: id,
  });
  return { ok: true };
}

async function broadcastAnnouncementToUsers(announcement: {
  id: string;
  titleJson: string;
  bodyJson: string;
  type: string;
  audience: string;
}) {
  const title = safeJson(announcement.titleJson);
  const body = safeJson(announcement.bodyJson);
  const t = typeof title === "string" ? title : (title as Record<string, string>)?.ar ?? JSON.stringify(title);
  const b = typeof body === "string" ? body : (body as Record<string, string>)?.ar ?? JSON.stringify(body);

  const where: Record<string, unknown> = {};
  if (announcement.audience === "verified") where.verification = { is: { status: "verified" } };
  if (announcement.audience === "sellers") where.products = { some: {} };
  if (announcement.audience === "buyers") where.ordersAsBuyer = { some: {} };
  if (announcement.audience === "communities") where.groupMemberships = { some: { status: "active" } };

  const users = await db.user.findMany({ where, select: { id: true } });
  if (users.length === 0) return;

  await db.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: `announcement_${announcement.type}`,
      title: t,
      body: b,
      href: "/notifications",
      dataJson: JSON.stringify({ announcementId: announcement.id }),
    })),
  });
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
