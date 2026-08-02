import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listFeatureFlags(input: {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (input.enabled !== undefined) where.enabled = input.enabled;

  const [items, total] = await Promise.all([
    db.featureFlag.findMany({
      where,
      orderBy: { key: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.featureFlag.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getFeatureFlagStats() {
  const [total, enabled] = await Promise.all([
    db.featureFlag.count(),
    db.featureFlag.count({ where: { enabled: true } }),
  ]);
  return { total, enabled };
}

export async function createFeatureFlag(input: {
  adminId: string;
  key: string;
  label?: string;
  description?: string;
  enabled?: boolean;
}) {
  const existing = await db.featureFlag.findUnique({ where: { key: input.key } });
  if (existing) throw new Error("FLAG_KEY_EXISTS");

  const flag = await db.featureFlag.create({
    data: {
      key: input.key,
      label: input.label ?? input.key,
      description: input.description,
      enabled: input.enabled ?? false,
    },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "flags.create",
    entityType: "FeatureFlag",
    entityId: flag.id,
    newValue: { key: input.key, enabled: flag.enabled },
  });
  return flag;
}

export async function setFeatureFlag(input: {
  adminId: string;
  key: string;
  enabled: boolean;
}) {
  const existing = await db.featureFlag.findUnique({ where: { key: input.key } });
  if (!existing) throw new Error("FLAG_NOT_FOUND");

  const flag = await db.featureFlag.update({
    where: { key: input.key },
    data: { enabled: input.enabled },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: `flags.${input.enabled ? "enable" : "disable"}`,
    entityType: "FeatureFlag",
    entityId: flag.id,
    previousValue: { enabled: existing.enabled },
    newValue: { key: input.key, enabled: input.enabled },
  });
  return flag;
}

export async function deleteFeatureFlag(adminId: string, key: string) {
  const existing = await db.featureFlag.findUnique({ where: { key } });
  if (!existing) throw new Error("FLAG_NOT_FOUND");

  await db.featureFlag.delete({ where: { key } });
  await writeAdminAudit({
    adminId,
    action: "flags.delete",
    entityType: "FeatureFlag",
    entityId: existing.id,
    previousValue: { key, enabled: existing.enabled },
    newValue: null,
  });
  return { ok: true };
}
