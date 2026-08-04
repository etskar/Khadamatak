import "server-only";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { ADMIN_PERMISSIONS } from "@/types/admin";
import { revokeAllSessionsForAdmin } from "@/server/admin/auth";
import { ADMIN_IDLE_TIMEOUT_MS } from "@/lib/admin-constants";
export { ADMIN_SESSION_COOKIE } from "@/lib/admin-constants";

export type AdminContext = {
  admin: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    status: string;
    twoFactorEnabled: boolean;
  };
  role: {
    id: string;
    key: string;
    name: string;
  };
  session: {
    id: string;
    expiresAt: Date;
    ipAddress: string | null;
    deviceLabel: string | null;
  };
  permissions: Set<string>;
};

export async function getAdminContext(token: string | null | undefined): Promise<AdminContext | null> {
  if (!token) return null;

  const session = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      adminUser: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

  if (!session) return null;
  if (session.status !== "active") return null;
  if (session.expiresAt < new Date()) return null;
  if (session.adminUser.status !== "active") return null;

  // idle timeout
  const idleMs = Date.now() - session.lastSeenAt.getTime();
  if (idleMs > ADMIN_IDLE_TIMEOUT_MS) {
    await db.adminSession.update({
      where: { id: session.id },
      data: { status: "expired", revokedAt: new Date() },
    });
    return null;
  }

  // touch lastSeenAt at most once per minute
  if (idleMs > 60_000) {
    await db.adminSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }

  const permissions = new Set(
    session.adminUser.role.permissions.map((p) => p.permission.key),
  );

  return {
    admin: {
      id: session.adminUser.id,
      email: session.adminUser.email,
      name: session.adminUser.name,
      avatarUrl: session.adminUser.avatarUrl,
      status: session.adminUser.status,
      twoFactorEnabled: session.adminUser.twoFactorEnabled,
    },
    role: {
      id: session.adminUser.role.id,
      key: session.adminUser.role.key,
      name: session.adminUser.role.name,
    },
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      deviceLabel: session.deviceLabel,
    },
    permissions,
  };
}

export function canAdmin(ctx: AdminContext | null, permission: string): boolean {
  return Boolean(ctx?.permissions.has(permission));
}

export function requireAdminPermission(ctx: AdminContext | null, permission: string) {
  if (!ctx) throw new Error("ADMIN_AUTH_REQUIRED");
  if (!ctx.permissions.has(permission)) throw new Error("ADMIN_FORBIDDEN");
}

// ─── Role & permission management ─────────────────────────────

export async function listRoles() {
  return db.adminRole.findMany({
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
    orderBy: { isSystem: "desc" },
  });
}

export async function getRole(id: string) {
  return db.adminRole.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
      users: true,
    },
  });
}

export async function getPermissionCatalog() {
  const dbPerms = await db.adminPermission.findMany({ orderBy: { category: "asc" } });
  const byKey = new Map(dbPerms.map((p) => [p.key, p]));
  return {
    db: dbPerms,
    catalog: ADMIN_PERMISSIONS,
    missing: ADMIN_PERMISSIONS.filter((p) => !byKey.has(p.key)),
  };
}

export async function createRole(input: {
  key: string;
  name: string;
  nameAr?: string;
  nameNl?: string;
  description?: string;
  permissionKeys: string[];
}) {
  const key = input.key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const existing = await db.adminRole.findUnique({ where: { key } });
  if (existing) throw new Error("ROLE_KEY_EXISTS");

  return db.adminRole.create({
    data: {
      key,
      name: input.name,
      nameAr: input.nameAr,
      nameNl: input.nameNl,
      description: input.description,
      permissions: {
        create: input.permissionKeys.map((permissionId) => ({ permissionId })),
      },
    },
  });
}

export async function updateRole(input: {
  id: string;
  name?: string;
  nameAr?: string;
  nameNl?: string;
  description?: string;
  permissionKeys?: string[];
}) {
  const role = await db.adminRole.findUnique({ where: { id: input.id } });
  if (!role) throw new Error("ROLE_NOT_FOUND");
  if (role.isSystem && input.permissionKeys) {
    throw new Error("SYSTEM_ROLE_LOCKED");
  }

  return db.$transaction(async (tx) => {
    const data: Record<string, unknown> = {};
    if (input.name) data.name = input.name;
    if (input.nameAr !== undefined) data.nameAr = input.nameAr;
    if (input.nameNl !== undefined) data.nameNl = input.nameNl;
    if (input.description !== undefined) data.description = input.description;

    const updated = await tx.adminRole.update({ where: { id: role.id }, data });

    if (input.permissionKeys) {
      await tx.adminRolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.adminRolePermission.createMany({
        data: input.permissionKeys.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }
    return updated;
  });
}

export async function deleteRole(id: string) {
  const role = await db.adminRole.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!role) throw new Error("ROLE_NOT_FOUND");
  if (role.isSystem) throw new Error("SYSTEM_ROLE_LOCKED");
  if (role._count.users > 0) throw new Error("ROLE_HAS_USERS");
  return db.adminRole.delete({ where: { id } });
}

// ─── Admin user management ────────────────────────────────────

export async function listAdminUsers() {
  return db.adminUser.findMany({
    include: {
      role: true,
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminUser(id: string) {
  return db.adminUser.findUnique({
    where: { id },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      sessions: { orderBy: { createdAt: "desc" } },
      trustedDevices: true,
      loginAttempts: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  name: string;
  roleId: string;
}) {
  const { hashPassword } = await import("@/lib/crypto");
  const email = input.email.toLowerCase().trim();
  const existing = await db.adminUser.findUnique({ where: { email } });
  if (existing) throw new Error("ADMIN_EMAIL_EXISTS");
  if (input.password.length < 8) throw new Error("WEAK_PASSWORD");

  return db.adminUser.create({
    data: {
      email,
      name: input.name,
      roleId: input.roleId,
      passwordHash: await hashPassword(input.password),
      mustChangePassword: true,
    },
  });
}

export async function updateAdminUser(input: {
  id: string;
  name?: string;
  roleId?: string;
  status?: string;
  twoFactorEnabled?: boolean;
}) {
  const result = await db.adminUser.update({
    where: { id: input.id },
    data: {
      name: input.name,
      roleId: input.roleId,
      status: input.status,
      twoFactorEnabled: input.twoFactorEnabled,
    },
  });

  // Revoke sessions when role, status or 2FA changes
  if (input.roleId || input.status !== undefined || input.twoFactorEnabled !== undefined) {
    await revokeAllSessionsForAdmin(input.id);
  }

  return result;
}

export async function resetAdminPassword(id: string, newPassword: string) {
  const { hashPassword } = await import("@/lib/crypto");
  if (newPassword.length < 8) throw new Error("WEAK_PASSWORD");

  // Revoke all sessions first — password reset means re-authentication
  await revokeAllSessionsForAdmin(id);

  return db.adminUser.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
}

export async function deleteAdminUser(id: string) {
  const target = await db.adminUser.findUnique({ where: { id }, include: { role: true } });
  if (!target) throw new Error("ADMIN_NOT_FOUND");
  if (target.role.key === "super_admin") throw new Error("CANNOT_DELETE_SUPER_ADMIN");
  await revokeAllSessionsForAdmin(id);
  return db.adminUser.delete({ where: { id } });
}
