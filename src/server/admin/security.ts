import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listSecurityEvents(input: {
  userId?: string;
  type?: string;
  severity?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (input.userId) where.userId = input.userId;
  if (input.type) where.type = input.type;
  if (input.severity) where.severity = input.severity;

  const [items, total] = await Promise.all([
    db.securityEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } },
      },
    }),
    db.securityEvent.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getSecurityEvent(id: string) {
  return db.securityEvent.findUnique({
    where: { id },
    include: { user: { include: { profile: true } } },
  });
}

export async function acknowledgeSecurityEvent(adminId: string, id: string) {
  const existing = await db.securityEvent.findUnique({ where: { id } });
  if (!existing) throw new Error("EVENT_NOT_FOUND");
  if (existing.acknowledgedAt) throw new Error("ALREADY_ACKNOWLEDGED");
  const updated = await db.securityEvent.update({
    where: { id },
    data: { acknowledgedById: adminId, acknowledgedAt: new Date() },
  });
  await writeAdminAudit({
    adminId,
    action: "security.event_acknowledged",
    entityType: "SecurityEvent",
    entityId: id,
    previousValue: null,
    newValue: { acknowledgedById: adminId },
  });
  return updated;
}

/** Runtime helper to raise a security event (used by business logic + fraud engine). */
export async function logSecurityEvent(input: {
  userId?: string;
  adminUserId?: string;
  type: string;
  severity?: string;
  title: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceHash?: string;
  metadata?: Record<string, unknown>;
}) {
  return db.securityEvent.create({
    data: {
      publicId: `KH-SE-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      userId: input.userId ?? null,
      adminUserId: input.adminUserId ?? null,
      type: input.type,
      severity: input.severity ?? "low",
      title: input.title,
      description: input.description,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceHash: input.deviceHash,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function listRiskScores(input: {
  minScore?: number;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (input.minScore) where.score = { gte: input.minScore };

  const [items, total] = await Promise.all([
    db.riskScore.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } },
      },
    }),
    db.riskScore.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getRiskScore(userId: string) {
  return db.riskScore.findUnique({ where: { userId } });
}

export async function setUserRiskScore(input: {
  adminId: string;
  userId: string;
  score: number;
  level?: string;
  factors?: { label: string; points: number }[];
  reason?: string;
}) {
  const level = input.level ?? riskLevel(input.score);
  const factorsJson = JSON.stringify({
    factors: input.factors ?? [],
    reason: input.reason,
    reviewedById: input.adminId,
    reviewedAt: new Date().toISOString(),
  });
  const existing = await db.riskScore.findUnique({ where: { userId: input.userId } });
  const updated = await db.riskScore.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, score: input.score, level, factorsJson },
    update: { score: input.score, level, factorsJson },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "fraud.risk_score_updated",
    entityType: "RiskScore",
    entityId: input.userId,
    previousValue: existing ? { score: existing.score, level: existing.level } : null,
    newValue: { score: input.score, level },
    metadata: { reason: input.reason },
  });
  return updated;
}

export function riskLevel(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}
