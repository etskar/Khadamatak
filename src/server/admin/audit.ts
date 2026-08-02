import "server-only";
import { db } from "@/lib/db";

export async function listAuditLogs(input: {
  adminActorId?: string;
  actorUserId?: string;
  entityType?: string;
  action?: string;
  query?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const createdAtFilter: { gte?: Date; lte?: Date } = {};
  if (input.from) createdAtFilter.gte = new Date(input.from);
  if (input.to) createdAtFilter.lte = new Date(input.to);
  const where: Record<string, unknown> = {
    ...(input.adminActorId ? { actorAdminId: input.adminActorId } : {}),
    ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...(input.action ? { action: input.action } : {}),
    ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}),
    ...(input.query
      ? { OR: [{ entityId: { contains: input.query } }, { metadataJson: { contains: input.query } }] }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        adminActor: { select: { id: true, name: true, email: true } },
        actor: { select: { id: true, email: true } },
        transaction: { select: { id: true, reference: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getAuditLog(id: string) {
  return db.auditLog.findUnique({
    where: { id },
    include: {
      adminActor: { select: { id: true, name: true, email: true } },
      actor: { include: { profile: { select: { displayName: true, username: true } } } },
      transaction: true,
    },
  });
}

export async function getAuditStats(input: { from?: string; to?: string }) {
  const createdAtFilter: { gte?: Date; lte?: Date } = {};
  if (input.from) createdAtFilter.gte = new Date(input.from);
  if (input.to) createdAtFilter.lte = new Date(input.to);
  const where: Record<string, unknown> = Object.keys(createdAtFilter).length
    ? { createdAt: createdAtFilter }
    : {};
  const [total, byAction, byEntity, byActor, recentUsers] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.groupBy({
      by: ["action"],
      where,
      _count: { _all: true },
      orderBy: { _count: { action: "desc" } },
      take: 10,
    }),
    db.auditLog.groupBy({
      by: ["entityType"],
      where,
      _count: { _all: true },
      orderBy: { _count: { entityType: "desc" } },
      take: 10,
    }),
    db.auditLog.groupBy({
      by: ["actorAdminId"],
      where: { ...where, actorAdminId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { actorAdminId: "desc" } },
      take: 10,
    }),
    db.auditLog.findMany({
      where: { ...where, actorUserId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { id: true, email: true } } },
    }),
  ]);
  return {
    total,
    byAction,
    byEntity,
    byActor,
    recentUserActivity: recentUsers.map((l) => ({ id: l.id, action: l.action, email: l.actor?.email ?? null, createdAt: l.createdAt })),
  };
}
