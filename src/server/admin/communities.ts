import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listGroups(input: {
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
    where.OR = [{ name: { contains: input.query } }, { city: { contains: input.query } }, { slug: { contains: input.query } }];
  }

  const [items, total] = await Promise.all([
    db.cityGroup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        createdBy: { include: { profile: { select: { displayName: true, username: true } } } },
        _count: { select: { members: true, posts: true, products: true, services: true } },
      },
    }),
    db.cityGroup.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getGroupDetail(id: string) {
  return db.cityGroup.findUnique({
    where: { id },
    include: {
      createdBy: { include: { profile: true } },
      members: {
        include: { user: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } } },
        orderBy: { createdAt: "asc" },
      },
      posts: { include: { author: { include: { profile: true } } }, orderBy: { createdAt: "desc" } },
      products: true,
      services: true,
    },
  });
}

export async function setGroupStatus(input: {
  adminId: string;
  groupId: string;
  action: "lock" | "archive" | "restore" | "delete";
}) {
  const group = await db.cityGroup.findUnique({ where: { id: input.groupId } });
  if (!group) throw new Error("GROUP_NOT_FOUND");

  const statusMap: Record<string, string> = {
    lock: "locked",
    archive: "archived",
    restore: "active",
    delete: "archived",
  };
  const next = statusMap[input.action];

  await db.cityGroup.update({
    where: { id: group.id },
    data: input.action === "delete" ? { status: next, name: `${group.name} [deleted]` } : { status: next },
  });

  await writeAdminAudit({
    adminId: input.adminId,
    action: `community.group.${input.action}`,
    entityType: "CityGroup",
    entityId: group.id,
    previousValue: group.status,
    newValue: next,
  });
  return { ok: true, status: next };
}

export async function transferGroupOwnership(input: {
  adminId: string;
  groupId: string;
  newOwnerUserId: string;
}) {
  const group = await db.cityGroup.findUnique({ where: { id: input.groupId } });
  if (!group) throw new Error("GROUP_NOT_FOUND");

  const targetMember = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: input.newOwnerUserId } },
  });
  if (!targetMember) throw new Error("MEMBER_NOT_FOUND");

  await db.$transaction([
    db.groupMember.updateMany({
      where: { groupId: group.id, role: "admin" },
      data: { role: "moderator" },
    }),
    db.groupMember.update({
      where: { id: targetMember.id },
      data: { role: "admin", status: "active", joinedAt: new Date() },
    }),
    db.cityGroup.update({
      where: { id: group.id },
      data: { createdById: input.newOwnerUserId },
    }),
  ]);

  await writeAdminAudit({
    adminId: input.adminId,
    action: "community.transfer_ownership",
    entityType: "CityGroup",
    entityId: group.id,
    previousValue: group.createdById,
    newValue: input.newOwnerUserId,
  });
  return { ok: true };
}

export async function removeGroupMember(input: {
  adminId: string;
  groupId: string;
  userId: string;
}) {
  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId: input.groupId, userId: input.userId } },
  });
  if (!member) throw new Error("MEMBER_NOT_FOUND");
  if (member.role === "admin") throw new Error("CANNOT_REMOVE_ADMIN");

  await db.groupMember.update({
    where: { id: member.id },
    data: { status: "banned" },
  });
  await db.cityGroup.update({
    where: { id: input.groupId },
    data: { memberCount: { decrement: 1 } },
  });

  await writeAdminAudit({
    adminId: input.adminId,
    action: "community.remove_member",
    entityType: "CityGroup",
    entityId: input.groupId,
    metadata: { userId: input.userId },
  });
  return { ok: true };
}
