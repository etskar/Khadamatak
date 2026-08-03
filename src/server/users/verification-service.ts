import "server-only";
import { db } from "@/lib/db";
import { siteConfig } from "@/config/site";
import { generateOtpCode, hashToken, hashPassword, verifyPassword } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export async function getVerification(userId: string) {
  return db.identityVerification.findUnique({ where: { userId } });
}

export async function submitVerification(input: {
  userId: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  country: string;
  postalCode: string;
  nationalId?: string;
  governmentIdUrl: string;
  selfieUrl?: string;
  termsAccepted: boolean;
}) {
  if (!input.termsAccepted) throw new Error("TERMS_REQUIRED");

  const user = await db.user.findUnique({
    where: { id: input.userId },
    include: { verification: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");
  if (!user.phoneVerifiedAt) throw new Error("PHONE_NOT_VERIFIED");

  const verification = await db.identityVerification.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      status: "pending",
      fullName: input.fullName,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      country: input.country,
      postalCode: input.postalCode,
      nationalId: input.nationalId,
      governmentIdUrl: input.governmentIdUrl,
      selfieUrl: input.selfieUrl,
      emailConfirmed: true,
      phoneConfirmed: true,
      termsAcceptedAt: new Date(),
      submittedAt: new Date(),
    },
    update: {
      status: "pending",
      fullName: input.fullName,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      country: input.country,
      postalCode: input.postalCode,
      nationalId: input.nationalId,
      governmentIdUrl: input.governmentIdUrl,
      selfieUrl: input.selfieUrl,
      emailConfirmed: true,
      phoneConfirmed: true,
      termsAcceptedAt: new Date(),
      submittedAt: new Date(),
      rejectionReason: null,
      reviewedAt: null,
    },
  });

  await db.user.update({
    where: { id: input.userId },
    data: { realName: input.fullName },
  });

  await writeAuditLog({
    actorUserId: input.userId,
    action: "verification.submitted",
    entityType: "IdentityVerification",
    entityId: verification.id,
  });

  // Auto-approve in development for smooth UX; production uses admin review
  if (process.env.NODE_ENV !== "production" || process.env.AUTO_VERIFY === "true") {
    return approveVerification({
      userId: input.userId,
      reviewerId: input.userId,
      auto: true,
    });
  }

  await db.notification.create({
    data: {
      userId: input.userId,
      type: "verification_update",
      title: "Verification pending",
      body: "Your identity verification is under review.",
      href: "/verification",
    },
  });

  return verification;
}

export async function approveVerification(input: {
  userId: string;
  reviewerId: string;
  auto?: boolean;
}) {
  const verification = await db.identityVerification.update({
    where: { userId: input.userId },
    data: {
      status: "verified",
      reviewedAt: new Date(),
      reviewedById: input.reviewerId,
      rejectionReason: null,
    },
  });

  await db.notification.create({
    data: {
      userId: input.userId,
      type: "verification_update",
      title: "Verified",
      body: input.auto
        ? "Your account is verified. You can trade and publish."
        : "Your identity was approved.",
      href: "/profile",
    },
  });

  return verification;
}

export async function rejectVerification(input: {
  userId: string;
  reviewerId: string;
  reason: string;
}) {
  const verification = await db.identityVerification.update({
    where: { userId: input.userId },
    data: {
      status: "rejected",
      rejectionReason: input.reason,
      reviewedAt: new Date(),
      reviewedById: input.reviewerId,
    },
  });

  await db.notification.create({
    data: {
      userId: input.userId,
      type: "verification_update",
      title: "Verification rejected",
      body: input.reason,
      href: "/verification",
    },
  });

  return verification;
}

export async function sendPhoneOtp(userId: string, phone: string) {
  const rl = await rateLimit(`otp:phone:${userId}`, 5, 15 * 60_000);
  if (!rl.success) throw new Error("RATE_LIMITED");

  const code = generateOtpCode(6);
  await db.otpCode.create({
    data: {
      userId,
      channel: "phone",
      target: phone,
      codeHash: hashToken(code),
      purpose: "phone_verify",
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });

  // Dev: log OTP (wire SMS provider in production)
  console.info(`[phone-otp] ${phone}: ${code}`);

  return {
    sent: true,
    devCode: process.env.NODE_ENV === "production" ? undefined : code,
  };
}

export async function verifyPhoneOtp(userId: string, phone: string, code: string) {
  const otp = await db.otpCode.findFirst({
    where: {
      userId,
      channel: "phone",
      purpose: "phone_verify",
      target: phone,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new Error("OTP_INVALID");
  if (otp.attempts >= 5) throw new Error("OTP_LOCKED");

  if (otp.codeHash !== hashToken(code)) {
    await db.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("OTP_INVALID");
  }

  await db.$transaction([
    db.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: userId },
      data: { phone, phoneVerifiedAt: new Date() },
    }),
    db.identityVerification.updateMany({
      where: { userId },
      data: { phoneConfirmed: true },
    }),
  ]);

  return { ok: true };
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashToken(token);
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new Error("TOKEN_INVALID");
  }

  await db.$transaction([
    db.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    db.identityVerification.updateMany({
      where: { userId: record.userId },
      data: { emailConfirmed: true },
    }),
  ]);

  return { userId: record.userId };
}

export async function requestPasswordReset(email: string, locale: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  // Always succeed to prevent enumeration
  if (!user) return { ok: true };

  const { generateSecureToken } = await import("@/lib/crypto");
  const raw = generateSecureToken();
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });

  const appUrl = siteConfig.url;
  console.info(`[password-reset] ${appUrl}/${locale}/reset-password?token=${raw}`);

  return {
    ok: true,
    devToken: process.env.NODE_ENV === "production" ? undefined : raw,
  };
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) throw new Error("WEAK_PASSWORD");
  const tokenHash = hashToken(token);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new Error("TOKEN_INVALID");
  }

  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
  ]);

  return { ok: true };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) throw new Error("NO_PASSWORD");
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new Error("INVALID_PASSWORD");
  if (newPassword.length < 8) throw new Error("WEAK_PASSWORD");
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  return { ok: true };
}

export function canPerformVerifiedAction(status: string | null | undefined) {
  return status === "verified";
}
