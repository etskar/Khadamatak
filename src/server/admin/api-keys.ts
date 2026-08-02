import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export function generateApiKey(): { key: string; prefix: string; keyHash: string } {
  const key = `kh_${crypto.randomBytes(32).toString("base64url")}`;
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, prefix: key.slice(0, 12), keyHash };
}

export async function listApiKeys(input: { status?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = input.status ? { status: input.status } : {};
  const [items, total] = await Promise.all([
    db.apiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.apiKey.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function createApiKey(input: {
  adminId: string;
  name: string;
  scopes: string[];
  expiresAt?: string;
  rateLimitPerMinute?: number;
}) {
  const { key, prefix, keyHash } = generateApiKey();
  const created = await db.apiKey.create({
    data: {
      name: input.name,
      prefix,
      keyHash,
      scopesJson: JSON.stringify(input.scopes),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      rateLimitPerMinute: input.rateLimitPerMinute ?? 120,
      ownerId: input.adminId,
    },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "api.keys.create",
    entityType: "ApiKey",
    entityId: created.id,
    metadata: { name: input.name, prefix },
  });
  // The raw key is only returned once at creation time.
  return { ...created, key };
}

export async function rotateApiKey(adminId: string, id: string) {
  const existing = await db.apiKey.findUnique({ where: { id } });
  if (!existing) throw new Error("API_KEY_NOT_FOUND");
  const { key, prefix, keyHash } = generateApiKey();
  await db.apiKey.update({ where: { id }, data: { prefix, keyHash, lastUsedAt: null } });
  await writeAdminAudit({
    adminId,
    action: "api.keys.rotate",
    entityType: "ApiKey",
    entityId: id,
  });
  return { ...existing, key, prefix };
}

export async function setApiKeyStatus(adminId: string, id: string, status: "active" | "revoked") {
  const existing = await db.apiKey.findUnique({ where: { id } });
  if (!existing) throw new Error("API_KEY_NOT_FOUND");
  const updated = await db.apiKey.update({ where: { id }, data: { status } });
  await writeAdminAudit({
    adminId,
    action: `api.keys.${status}`,
    entityType: "ApiKey",
    entityId: id,
    previousValue: existing.status,
    newValue: status,
  });
  return updated;
}

export async function deleteApiKey(adminId: string, id: string) {
  await db.apiKey.delete({ where: { id } });
  await writeAdminAudit({
    adminId,
    action: "api.keys.delete",
    entityType: "ApiKey",
    entityId: id,
  });
  return { ok: true };
}

export async function listApiRequestLogs(input: {
  apiKeyId?: string;
  statusCode?: number;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (input.apiKeyId) where.apiKeyId = input.apiKeyId;
  if (input.statusCode) where.statusCode = input.statusCode;

  const [items, total] = await Promise.all([
    db.apiRequestLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { apiKey: { select: { id: true, name: true, prefix: true } } },
    }),
    db.apiRequestLog.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

/** Authenticate an incoming API request by raw key. Returns key or null. */
export async function authenticateApiKey(rawKey: string) {
  if (!rawKey?.startsWith("kh_")) return null;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const apiKey = await db.apiKey.findFirst({ where: { keyHash, status: "active" } });
  if (!apiKey) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  await db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return apiKey;
}
