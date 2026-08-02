import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listBackups(input: { page?: number; pageSize?: number }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const [items, total] = await Promise.all([
    db.backupRecord.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    db.backupRecord.count(),
  ]);
  return { items, total, page, pageSize };
}

export async function getBackup(id: string) {
  return db.backupRecord.findUnique({ where: { id } });
}

/** Record an automated or manual backup event. */
export async function recordBackup(input: {
  adminId?: string;
  type: string;
  status: string;
  fileName?: string;
  filePath?: string;
  sizeBytes?: number;
  checksum?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}) {
  const record = await db.backupRecord.create({
    data: {
      publicId: `KH-BK-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      type: input.type,
      status: input.status,
      fileName: input.fileName,
      filePath: input.filePath,
      sizeBytes: input.sizeBytes,
      checksum: input.checksum,
      startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
      createdById: input.adminId ?? null,
      metadataJson: JSON.stringify({
        durationMs: input.durationMs,
        error: input.error,
      }),
    },
  });
  if (input.adminId) {
    await writeAdminAudit({
      adminId: input.adminId,
      action: `backups.${input.status === "completed" ? "completed" : input.status}`,
      entityType: "BackupRecord",
      entityId: record.id,
      metadata: { type: input.type, fileName: input.fileName },
    });
  }
  return record;
}

export async function requestBackupNow(adminId: string) {
  const record = await recordBackup({
    adminId,
    type: "manual",
    status: "running",
    startedAt: new Date().toISOString(),
  });
  // Real implementation: stream the SQLite file to object storage and update status via recordBackup.
  return record;
}

export async function deleteBackup(adminId: string, id: string) {
  await db.backupRecord.delete({ where: { id } });
  await writeAdminAudit({
    adminId,
    action: "backups.delete",
    entityType: "BackupRecord",
    entityId: id,
  });
  return { ok: true };
}
