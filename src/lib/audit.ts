import "server-only";
import { db } from "@/lib/db";

type AuditInput = {
  actorUserId?: string | null;
  actorAdminId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  transactionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput) {
  return db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorAdminId: input.actorAdminId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      transactionId: input.transactionId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}
