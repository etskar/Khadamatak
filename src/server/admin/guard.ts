import "server-only";
import { cookies, headers } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  getAdminContext,
  type AdminContext,
} from "@/server/admin/rbac";
import { buildRequestInfo, type RequestInfo } from "@/server/admin/request";

export async function getAdminSessionContext(): Promise<AdminContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const ctx = await getAdminContext(token);
  if (!ctx) throw new Error("ADMIN_AUTH_REQUIRED");
  return ctx;
}

export async function getAdminSessionContextOrNull(): Promise<AdminContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return getAdminContext(token);
}

export async function getRequestInfo(): Promise<RequestInfo> {
  const h = await headers();
  return buildRequestInfo(h);
}

/** Create an immutable admin audit log entry with before/after values. */
export async function writeAdminAudit(input: {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}) {
  const { writeAuditLog } = await import("@/lib/audit");
  const req = await getRequestInfo();
  return writeAuditLog({
    actorAdminId: input.adminId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    ipAddress: req.ipAddress,
    userAgent: req.userAgent,
    metadata: {
      ...input.metadata,
      ...(input.previousValue !== undefined
        ? { previousValue: input.previousValue }
        : {}),
      ...(input.newValue !== undefined ? { newValue: input.newValue } : {}),
    },
  });
}
