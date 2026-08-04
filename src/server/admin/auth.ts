import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyPassword, hashToken, generateOtpCode } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { generateSecureToken } from "@/lib/crypto";
import {
  buildRequestInfo,
  hashDevice,
  type RequestInfo,
} from "@/server/admin/request";
import { generateTotpSecret, verifyTotp, buildTotpUri } from "@/lib/totp";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_MS,
  ADMIN_MAX_SESSIONS,
  ADMIN_CLEANUP_SAMPLE_RATE,
  ADMIN_CLEANUP_AGE_MS,
} from "@/lib/admin-constants";

const MAX_FAILED_LOGINS = 5;

// ─── Shared session factory ─────────────────────────────────────

type CreateSessionParams = {
  adminUserId: string;
  status?: string; // "active" (default) | "pending_2fa"
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceHash?: string | null;
  country?: string | null;
  city?: string | null;
  setCookie?: boolean; // true for bridge, false for adminLogin (action layer sets cookie)
};

/**
 * Single entry point for admin session creation.  Every code path that
 * creates an admin session must go through here.
 */
export async function createAdminSession(input: CreateSessionParams) {
  const token = generateSecureToken(32);

  // ── Concurrent-session limit ──
  const activeCount = await db.adminSession.count({
    where: { adminUserId: input.adminUserId, status: "active" },
  });
  if (activeCount >= ADMIN_MAX_SESSIONS) {
    const oldest = await db.adminSession.findMany({
      where: { adminUserId: input.adminUserId, status: "active" },
      orderBy: { createdAt: "asc" },
      take: activeCount - ADMIN_MAX_SESSIONS + 1,
    });
    if (oldest.length) {
      await db.adminSession.updateMany({
        where: { id: { in: oldest.map((s) => s.id) } },
        data: { status: "revoked", revokedAt: new Date() },
      });
    }
  }

  // ── Create the session row ──
  const session = await db.adminSession.create({
    data: {
      adminUserId: input.adminUserId,
      tokenHash: hashToken(token),
      status: input.status ?? "active",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      deviceHash: input.deviceHash ?? null,
      country: input.country ?? null,
      city: input.city ?? null,
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + ADMIN_SESSION_MAX_AGE_MS),
    },
  });

  // ── Set the browser cookie ──
  if (input.setCookie !== false) {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(ADMIN_SESSION_MAX_AGE_MS / 1000),
    });
  }

  // ── Background cleanup (sampled) ──
  if (Math.random() < 1 / ADMIN_CLEANUP_SAMPLE_RATE) {
    db.adminSession
      .deleteMany({
        where: {
          status: { in: ["revoked", "expired"] },
          revokedAt: { lt: new Date(Date.now() - ADMIN_CLEANUP_AGE_MS) },
        },
      })
      .catch(() => {
        /* fire‑and‑forget — never block a login */
      });
  }

  return { token, sessionId: session.id };
}

// ─── Revoke helper (used by rbac for auto‑revocation) ───────────

/** Revoke every active session for an admin.  Safe to call from rbac. */
export async function revokeAllSessionsForAdmin(adminId: string) {
  await db.adminSession.updateMany({
    where: { adminUserId: adminId, status: "active" },
    data: { status: "revoked", revokedAt: new Date() },
  });
}

async function logLoginAttempt(input: {
  adminUserId?: string | null;
  email: string;
  status: string;
  req: RequestInfo;
}) {
  await db.adminLoginAttempt.create({
    data: {
      adminUserId: input.adminUserId ?? null,
      email: input.email,
      status: input.status,
      ipAddress: input.req.ipAddress,
      userAgent: input.req.userAgent,
      deviceHash: input.req.deviceHash,
      country: input.req.country,
      city: input.req.city,
    },
  });
}

async function sendEmailOtp(adminUserId: string, email: string) {
  const code = generateOtpCode(6);
  await db.adminOtpCode.create({
    data: {
      adminUserId,
      channel: "email",
      target: email,
      codeHash: hashToken(code),
      purpose: "login_2fa",
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });

  // Wire a real email provider in production; dev logs the code.
  console.info(`[admin-2fa] ${email}: ${code}`);
  return code;
}

export async function adminLogin(input: {
  email: string;
  password: string;
  req: RequestInfo;
  userAgent?: string | null;
}) {
  const email = input.email.toLowerCase().trim();
  const rl = await rateLimit(`admin-login:${email}`, 10, 15 * 60_000);
  if (!rl.success) {
    await logLoginAttempt({ email, status: "rate_limited", req: input.req });
    return { ok: false as const, error: "RATE_LIMITED" };
  }

  const admin = await db.adminUser.findUnique({ where: { email } });

  if (!admin) {
    await logLoginAttempt({ email, status: "failed_password", req: input.req });
    return { ok: false as const, error: "INVALID_CREDENTIALS" };
  }

  if (admin.status !== "active") {
    await logLoginAttempt({
      adminUserId: admin.id,
      email,
      status: "locked",
      req: input.req,
    });
    return { ok: false as const, error: "ADMIN_LOCKED" };
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    await logLoginAttempt({
      adminUserId: admin.id,
      email,
      status: "locked",
      req: input.req,
    });
    return { ok: false as const, error: "ACCOUNT_LOCKED" };
  }

  const valid = await verifyPassword(input.password, admin.passwordHash);
  if (!valid) {
    const failures = admin.failedLoginCount + 1;
    const lockedUntil =
      failures >= MAX_FAILED_LOGINS ? new Date(Date.now() + 30 * 60_000) : null;
    await db.adminUser.update({
      where: { id: admin.id },
      data: {
        failedLoginCount: failures,
        lockedUntil,
        ...(lockedUntil ? {} : { lockedUntil: null }),
      },
    });
    await logLoginAttempt({
      adminUserId: admin.id,
      email,
      status: "failed_password",
      req: input.req,
    });

    await db.securityEvent.create({
      data: {
        publicId: `SE-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
        type: "failed_login",
        severity: failures >= MAX_FAILED_LOGINS ? "high" : "medium",
        adminUserId: admin.id,
        title: "Failed admin login attempt",
        description: `${failures}/${MAX_FAILED_LOGINS} failed attempts`,
        ipAddress: input.req.ipAddress,
        userAgent: input.req.userAgent,
        deviceHash: input.req.deviceHash,
      },
    });

    return { ok: false as const, error: "INVALID_CREDENTIALS" };
  }

  await db.adminUser.update({
    where: { id: admin.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  const twoFactorEnabled = Boolean(
    admin.twoFactorEnabled && admin.twoFactorSecret,
  );
  const deviceHash = input.req.deviceHash ?? hashDevice(input.userAgent);

  const session = await createAdminSession({
    adminUserId: admin.id,
    status: twoFactorEnabled ? "pending_2fa" : "active",
    ipAddress: input.req.ipAddress,
    userAgent: input.req.userAgent,
    deviceHash,
    country: input.req.country,
    city: input.req.city,
    setCookie: false, // the server-action layer sets the cookie
  });

  await logLoginAttempt({
    adminUserId: admin.id,
    email,
    status: "success",
    req: input.req,
  });

  return { ok: true as const, token: session.token, sessionId: session.sessionId, totpRequired: twoFactorEnabled };
}

export async function resendLoginOtp(sessionToken: string, _req: RequestInfo) {
  const session = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(sessionToken) },
    include: { adminUser: true },
  });
  if (!session || session.status !== "pending_2fa") throw new Error("SESSION_INVALID");
  if (session.adminUser.twoFactorEnabled && session.adminUser.twoFactorSecret) {
    throw new Error("TOTP_REQUIRED");
  }
  const code = await sendEmailOtp(session.adminUser.id, session.adminUser.email);
  return { ok: true, devCode: process.env.NODE_ENV === "production" ? undefined : code };
}

export async function verifyAdminTwoFactor(input: {
  sessionToken: string;
  code: string;
  req: RequestInfo;
  rememberDevice?: boolean;
}) {
  const session = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(input.sessionToken) },
    include: { adminUser: { include: { role: true } } },
  });
  if (!session || session.status !== "pending_2fa") throw new Error("SESSION_INVALID");
  if (session.expiresAt < new Date()) throw new Error("SESSION_EXPIRED");

  const admin = session.adminUser;

  let verified = false;
  if (admin.twoFactorEnabled && admin.twoFactorSecret) {
    const rl = await rateLimit(
      `admin-2fa:${admin.id}`,
      5,
      15 * 60_000,
    );
    if (!rl.success) throw new Error("2FA_RATE_LIMITED");
    verified = verifyTotp(admin.twoFactorSecret, input.code);
  } else {
    const otp = await db.adminOtpCode.findFirst({
      where: {
        adminUserId: admin.id,
        purpose: "login_2fa",
        channel: "email",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) throw new Error("OTP_INVALID");
    if (otp.attempts >= 5) throw new Error("OTP_LOCKED");
    if (otp.codeHash === hashToken(input.code)) {
      await db.adminOtpCode.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
      verified = true;
    } else {
      await db.adminOtpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
    }
  }

  if (!verified) {
    await db.securityEvent.create({
      data: {
        publicId: `SE-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
        type: "failed_login",
        severity: "high",
        adminUserId: admin.id,
        title: "Failed admin 2FA attempt",
        ipAddress: input.req.ipAddress,
        userAgent: input.req.userAgent,
      },
    });
    throw new Error("OTP_INVALID");
  }

  if (input.rememberDevice && input.req.deviceHash) {
    await db.adminTrustedDevice.upsert({
      where: {
        adminUserId_deviceHash: {
          adminUserId: admin.id,
          deviceHash: input.req.deviceHash,
        },
      },
      create: {
        adminUserId: admin.id,
        deviceHash: input.req.deviceHash,
        lastSeenAt: new Date(),
      },
      update: { lastSeenAt: new Date() },
    });
  }

  const active = await db.adminSession.update({
    where: { id: session.id },
    data: {
      status: "active",
      lastSeenAt: new Date(),
      deviceHash: input.req.deviceHash ?? session.deviceHash,
    },
  });

  await db.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date(), lastLoginIp: input.req.ipAddress, lastLoginCountry: input.req.country },
  });

  await writeAuditLog({
    actorAdminId: admin.id,
    action: "admin.login",
    entityType: "AdminSession",
    entityId: session.id,
    ipAddress: input.req.ipAddress,
    userAgent: input.req.userAgent,
    metadata: { rememberDevice: Boolean(input.rememberDevice) },
  });

  return { ok: true, sessionId: active.id };
}

export async function adminLogout(sessionToken: string) {
  await db.adminSession.updateMany({
    where: { tokenHash: hashToken(sessionToken) },
    data: { status: "revoked", revokedAt: new Date() },
  });
  return { ok: true };
}

export async function listAdminSessions(adminId: string) {
  return db.adminSession.findMany({
    where: { adminUserId: adminId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function revokeAdminSession(sessionId: string, actorAdminId: string) {
  const session = await db.adminSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("SESSION_NOT_FOUND");
  if (session.adminUserId !== actorAdminId) throw new Error("FORBIDDEN");

  await db.adminSession.update({
    where: { id: sessionId },
    data: { status: "revoked", revokedAt: new Date() },
  });
  await writeAuditLog({
    actorAdminId,
    action: "admin.session.revoked",
    entityType: "AdminSession",
    entityId: sessionId,
  });
  return { ok: true };
}

export async function revokeAllAdminSessions(adminId: string, exceptId?: string) {
  await db.adminSession.updateMany({
    where: { adminUserId: adminId, id: { not: exceptId ?? undefined } },
    data: { status: "revoked", revokedAt: new Date() },
  });
  return { ok: true };
}

export async function removeTrustedDevice(deviceId: string, adminId: string) {
  const device = await db.adminTrustedDevice.findUnique({ where: { id: deviceId } });
  if (!device || device.adminUserId !== adminId) throw new Error("FORBIDDEN");
  await db.adminTrustedDevice.delete({ where: { id: deviceId } });
  return { ok: true };
}

// ─── TOTP enrollment ──────────────────────────────────────────

export async function startTotpEnrollment(adminId: string) {
  const admin = await db.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw new Error("ADMIN_NOT_FOUND");

  const secret = generateTotpSecret();
  await db.adminUser.update({
    where: { id: adminId },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });

  return {
    secret,
    uri: buildTotpUri(secret, admin.email),
  };
}

export async function confirmTotpEnrollment(adminId: string, code: string) {
  const admin = await db.adminUser.findUnique({ where: { id: adminId } });
  if (!admin?.twoFactorSecret) throw new Error("NO_PENDING_ENROLLMENT");
  if (!verifyTotp(admin.twoFactorSecret, code)) throw new Error("OTP_INVALID");

  await db.adminUser.update({
    where: { id: adminId },
    data: { twoFactorEnabled: true },
  });

  await writeAuditLog({
    actorAdminId: adminId,
    action: "admin.2fa_enabled",
    entityType: "AdminUser",
    entityId: adminId,
  });
  return { ok: true };
}

export async function disableTotp(adminId: string) {
  await db.adminUser.update({
    where: { id: adminId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  await writeAuditLog({
    actorAdminId: adminId,
    action: "admin.2fa_disabled",
    entityType: "AdminUser",
    entityId: adminId,
  });
  return { ok: true };
}

export { buildRequestInfo };
