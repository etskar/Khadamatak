import "server-only";
import { db } from "@/lib/db";
import { hashPassword, generateSecureToken } from "@/lib/crypto";
import { approveVerification, rejectVerification } from "@/server/users/verification-service";
import { writeAdminAudit } from "@/server/admin/guard";

export async function searchUsers(input: {
  query?: string;
  accountStatus?: string;
  verificationStatus?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));

  const where: Record<string, unknown> = {};
  if (input.query) {
    where.OR = [
      { email: { contains: input.query } },
      { profile: { is: { username: { contains: input.query } } } },
      { profile: { is: { displayName: { contains: input.query } } } },
      { phone: { contains: input.query } },
    ];
  }
  if (input.accountStatus) where.accountStatus = input.accountStatus;
  if (input.role) where.role = input.role;
  if (input.verificationStatus) {
    where.verification = { is: { status: input.verificationStatus } };
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        profile: { select: { username: true, displayName: true, avatarUrl: true, city: true, country: true } },
        wallet: { select: { walletId: true, status: true, availableCents: true } },
        verification: { select: { status: true, submittedAt: true } },
        _count: { select: { ordersAsBuyer: true, ordersAsSeller: true, dealsAsBuyer: true, dealsAsSeller: true, posts: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return { users, total, page, pageSize };
}

export async function getUserDetail(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      wallet: true,
      verification: true,
      location: true,
      businessAccount: true,
      riskScore: true,
      _count: {
        select: {
          ordersAsBuyer: true,
          ordersAsSeller: true,
          dealsAsBuyer: true,
          dealsAsSeller: true,
          posts: true,
          reports: true,
          products: true,
          services: true,
          groupMemberships: true,
        },
      },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      securityEvents: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function setUserAccountStatus(input: {
  adminId: string;
  userId: string;
  action: "suspend" | "ban" | "restore" | "deactivate";
  reason?: string;
}) {
  const target = await db.user.findUnique({ where: { id: input.userId } });
  if (!target) throw new Error("USER_NOT_FOUND");

  const statusMap: Record<string, string> = {
    suspend: "suspended",
    ban: "banned",
    restore: "active",
    deactivate: "deactivated",
  };
  const next = statusMap[input.action];

  await db.user.update({
    where: { id: input.userId },
    data: { accountStatus: next, tokenVersion: { increment: 1 } },
  });

  if (next === "banned" || next === "suspended") {
    await db.wallet.updateMany({
      where: { userId: input.userId, status: "active" },
      data: { status: "suspended" },
    });
  }
  if (next === "active") {
    await db.wallet.updateMany({
      where: { userId: input.userId, status: "suspended" },
      data: { status: "active" },
    });
  }

  await db.notification.create({
    data: {
      userId: input.userId,
      type: "account_status",
      title: input.action === "restore" ? "Account restored" : "Account updated",
      body: input.reason ?? `Your account status is now ${next}.`,
      href: "/",
    },
  });

  await writeAdminAudit({
    adminId: input.adminId,
    action: `user.${input.action}`,
    entityType: "User",
    entityId: input.userId,
    previousValue: target.accountStatus,
    newValue: next,
    metadata: { reason: input.reason },
  });

  return { ok: true, accountStatus: next };
}

export async function resetUserPassword(adminId: string, userId: string) {
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("USER_NOT_FOUND");
  const temp = generateSecureToken(10);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(temp), tokenVersion: { increment: 1 } },
  });
  await writeAdminAudit({
    adminId,
    action: "user.password_reset",
    entityType: "User",
    entityId: userId,
    newValue: { tempPassword: temp },
  });
  return { ok: true, tempPassword: temp };
}

export async function adminApproveVerification(adminId: string, userId: string) {
  await approveVerification({ userId, reviewerId: userId });
  await writeAdminAudit({
    adminId,
    action: "verification.approve",
    entityType: "IdentityVerification",
    entityId: userId,
  });
  return { ok: true };
}

export async function adminRejectVerification(adminId: string, userId: string, reason: string) {
  await rejectVerification({ userId, reviewerId: userId, reason });
  await writeAdminAudit({
    adminId,
    action: "verification.reject",
    entityType: "IdentityVerification",
    entityId: userId,
    metadata: { reason },
  });
  return { ok: true };
}

export async function editUserAccount(adminId: string, userId: string, data: {
  email?: string;
  locale?: string;
  realName?: string | null;
  phone?: string | null;
}) {
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("USER_NOT_FOUND");

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(data.email ? { email: data.email.toLowerCase() } : {}),
      ...(data.locale ? { locale: data.locale } : {}),
      ...(data.realName !== undefined ? { realName: data.realName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
    },
  });

  await writeAdminAudit({
    adminId,
    action: "user.edit",
    entityType: "User",
    entityId: userId,
    previousValue: { email: target.email, locale: target.locale },
    newValue: data,
  });
  return updated;
}

export async function deleteUserAccount(adminId: string, userId: string) {
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("USER_NOT_FOUND");
  if (target.role === "super_admin") throw new Error("CANNOT_DELETE_ADMIN");

  // Soft-delete to preserve financial records: anonymize + ban.
  await db.user.update({
    where: { id: userId },
    data: {
      email: `deleted-${userId.slice(0, 8)}@khadamatak.com`,
      accountStatus: "banned",
      tokenVersion: { increment: 1 },
    },
  });

  await writeAdminAudit({
    adminId,
    action: "user.delete",
    entityType: "User",
    entityId: userId,
    metadata: { softDelete: true },
  });
  return { ok: true };
}

export async function exportUsers() {
  const users = await db.user.findMany({
    include: {
      profile: true,
      wallet: true,
      verification: true,
    },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    accountStatus: u.accountStatus,
    locale: u.locale,
    realName: u.realName,
    phone: u.phone,
    createdAt: u.createdAt.toISOString(),
    username: u.profile?.username,
    displayName: u.profile?.displayName,
    city: u.profile?.city,
    country: u.profile?.country,
    walletId: u.wallet?.walletId,
    walletStatus: u.wallet?.status,
    availableCents: u.wallet?.availableCents,
    verificationStatus: u.verification?.status,
  }));
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
}
