import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function getSystemSettings() {
  const [platform, settings, flags] = await Promise.all([
    db.platformSettings.findUnique({ where: { id: "default" } }),
    db.systemSetting.findMany({ orderBy: { category: "asc" } }),
    db.featureFlag.findMany({ orderBy: { key: "asc" } }),
  ]);
  return {
    platform,
    settings: settings.map((s) => ({ ...s, value: safeJson(s.valueJson) })),
    flags,
  };
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function updatePlatformSettings(input: {
  adminId: string;
  data: {
    feePercentBps?: number;
    feeFixedCents?: number;
    minFeeCents?: number;
    currency?: string;
    timezone?: string;
    defaultLanguage?: string;
    theme?: string;
    maintenanceMode?: boolean;
    maintenanceMessage?: { ar?: string; nl?: string };
    emailFromAddress?: string;
    marketplaceRulesJson?: string;
    verificationRulesJson?: string;
    walletRulesJson?: string;
    escrowRulesJson?: string;
  };
}) {
  const before = await db.platformSettings.findUnique({ where: { id: "default" } });

  const updated = await db.platformSettings.update({
    where: { id: "default" },
    data: {
      ...(input.data.feePercentBps !== undefined ? { feePercentBps: input.data.feePercentBps } : {}),
      ...(input.data.feeFixedCents !== undefined ? { feeFixedCents: input.data.feeFixedCents } : {}),
      ...(input.data.minFeeCents !== undefined ? { minFeeCents: input.data.minFeeCents } : {}),
      ...(input.data.currency !== undefined ? { currency: input.data.currency } : {}),
      ...(input.data.timezone !== undefined ? { timezone: input.data.timezone } : {}),
      ...(input.data.defaultLanguage !== undefined ? { defaultLanguage: input.data.defaultLanguage } : {}),
      ...(input.data.theme !== undefined ? { theme: input.data.theme } : {}),
      ...(input.data.maintenanceMode !== undefined ? { maintenanceMode: input.data.maintenanceMode } : {}),
      ...(input.data.maintenanceMessage
        ? { maintenanceMessageJson: JSON.stringify(input.data.maintenanceMessage) }
        : {}),
      ...(input.data.emailFromAddress !== undefined ? { emailFromAddress: input.data.emailFromAddress } : {}),
      ...(input.data.marketplaceRulesJson !== undefined ? { marketplaceRulesJson: input.data.marketplaceRulesJson } : {}),
      ...(input.data.verificationRulesJson !== undefined ? { verificationRulesJson: input.data.verificationRulesJson } : {}),
      ...(input.data.walletRulesJson !== undefined ? { walletRulesJson: input.data.walletRulesJson } : {}),
      ...(input.data.escrowRulesJson !== undefined ? { escrowRulesJson: input.data.escrowRulesJson } : {}),
    },
  });

  await writeAdminAudit({
    adminId: input.adminId,
    action: "settings.platform.update",
    entityType: "PlatformSettings",
    entityId: "default",
    previousValue: before,
    newValue: input.data,
  });
  return updated;
}

export async function upsertSystemSetting(input: {
  adminId: string;
  key: string;
  value: unknown;
  category?: string;
  description?: string;
  isSecret?: boolean;
}) {
  const existing = await db.systemSetting.findUnique({ where: { key: input.key } });
  const updated = await db.systemSetting.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      valueJson: JSON.stringify(input.value),
      category: input.category ?? "general",
      description: input.description,
      isSecret: input.isSecret ?? false,
    },
    update: {
      valueJson: JSON.stringify(input.value),
      category: input.category,
      description: input.description,
      isSecret: input.isSecret,
    },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "settings.system.upsert",
    entityType: "SystemSetting",
    entityId: updated.id,
    previousValue: existing,
    newValue: { key: input.key, value: input.value },
  });
  return updated;
}

export async function listFeatureFlags() {
  return db.featureFlag.findMany({ orderBy: { key: "asc" } });
}

export async function updateFeatureFlag(input: {
  adminId: string;
  key: string;
  enabled: boolean;
}) {
  const flag = await db.featureFlag.upsert({
    where: { key: input.key },
    create: { key: input.key, label: input.key, enabled: input.enabled },
    update: { enabled: input.enabled },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: `flags.${input.enabled ? "enable" : "disable"}`,
    entityType: "FeatureFlag",
    entityId: flag.id,
    newValue: { key: input.key, enabled: input.enabled },
  });
  return flag;
}

/** Runtime helper used by business logic to check a feature flag. */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({ where: { key } });
  if (!flag) return true; // default on unless explicitly disabled
  if (!flag.enabled) return false;
  if (flag.startsAt && flag.startsAt > new Date()) return false;
  if (flag.endsAt && flag.endsAt < new Date()) return false;
  return true;
}
