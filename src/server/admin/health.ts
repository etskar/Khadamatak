import "server-only";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";

export async function getSystemHealth() {
  const dbFile = path.join(process.cwd(), "prisma", "dev.db");
  let dbSizeBytes: number | null = null;
  try {
    if (fs.existsSync(dbFile)) dbSizeBytes = fs.statSync(dbFile).size;
  } catch {
    dbSizeBytes = null;
  }

  const [
    dbOk,
    userCount,
    pendingVerifications,
    failedLogins24h,
    queuedEmails,
    failedEmails24h,
    runningBackups,
    failedBackups,
    openTickets,
    activeAdminUsers,
  ] = await Promise.all([
    db.$queryRawUnsafe("SELECT 1 as ok").then(() => true).catch(() => false),
    db.user.count(),
    db.identityVerification.count({ where: { status: "pending" } }),
    db.adminLoginAttempt.count({
      where: { status: { not: "success" }, createdAt: { gte: new Date(Date.now() - 24 * 3600000) } },
    }),
    db.emailLog.count({ where: { status: "queued" } }),
    db.emailLog.count({
      where: { status: "failed", createdAt: { gte: new Date(Date.now() - 24 * 3600000) } },
    }),
    db.backupRecord.count({ where: { status: "running" } }),
    db.backupRecord.count({
      where: { status: "failed", createdAt: { gte: new Date(Date.now() - 24 * 3600000) } },
    }),
    db.supportTicket.count({ where: { status: { in: ["open", "assigned", "in_progress"] } } }),
    db.adminUser.count({ where: { status: "active" } }),
  ]);

  return {
    database: { ok: dbOk, fileSizeBytes: dbSizeBytes },
    users: { total: userCount, pendingVerifications },
    security: { failedLogins24h },
    email: { queuedEmails, failedEmails24h },
    backups: { runningBackups, failedBackups },
    support: { openTickets },
    admins: { activeAdminUsers },
    timestamp: new Date().toISOString(),
  };
}

export async function getPerformanceMetrics() {
  const hourAgo = new Date(Date.now() - 3600000);
  const [apiCalls, apiErrors, avgLatency, failedEmails, auditToday] = await Promise.all([
    db.apiRequestLog.count({ where: { createdAt: { gte: hourAgo } } }),
    db.apiRequestLog.count({
      where: { createdAt: { gte: hourAgo }, statusCode: { gte: 500 } },
    }),
    db.apiRequestLog.aggregate({
      _avg: { latencyMs: true },
      where: { createdAt: { gte: hourAgo }, latencyMs: { not: null } },
    }),
    db.emailLog.count({ where: { status: "failed", createdAt: { gte: hourAgo } } }),
    db.auditLog.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);

  return {
    api: {
      callsLastHour: apiCalls,
      errorsLastHour: apiErrors,
      avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
      errorRate: apiCalls > 0 ? (apiErrors / apiCalls) * 100 : 0,
    },
    email: { failedLastHour: failedEmails },
    activity: { auditEntriesToday: auditToday },
  };
}
