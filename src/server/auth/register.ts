import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, generateSecureToken, hashToken } from "@/lib/crypto";
import { ensureWalletForUser } from "@/server/finance/wallet-service";
import { slugifyUsername } from "@/lib/ids";
import { rateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(80),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/),
  phone: z.string().max(32).optional(),
  locale: z.enum(["ar", "nl"]).default("ar"),
});

export async function registerUser(
  input: z.infer<typeof registerSchema>,
  meta?: { ip?: string },
) {
  const parsed = registerSchema.parse(input);
  const email = parsed.email.toLowerCase().trim();
  const username = slugifyUsername(parsed.username);

  const rl = await rateLimit(`register:${meta?.ip ?? email}`, 10, 60_000);
  if (!rl.success) throw new Error("RATE_LIMITED");

  const existingEmail = await db.user.findUnique({ where: { email } });
  if (existingEmail) throw new Error("EMAIL_TAKEN");

  const existingUsername = await db.profile.findUnique({ where: { username } });
  if (existingUsername) throw new Error("USERNAME_TAKEN");

  const passwordHash = await hashPassword(parsed.password);

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        phone: parsed.phone || null,
        realName: parsed.fullName,
        locale: parsed.locale,
        role: "user",
        accountStatus: "active",
        // Production should leave this null until email link is clicked.
        emailVerified:
          process.env.NODE_ENV === "production" ? null : new Date(),
      },
    });

    await tx.profile.create({
      data: {
        userId: created.id,
        username,
        displayName: parsed.fullName,
      },
    });

    await tx.identityVerification.create({
      data: {
        userId: created.id,
        status: "not_started",
        emailConfirmed: process.env.NODE_ENV !== "production",
      },
    });

    await tx.bankingCapability.createMany({
      data: [
        "personal_iban",
        "virtual_card",
        "physical_card",
        "bank_withdrawal",
        "multi_currency",
        "intl_transfer",
      ].map((type) => ({
        userId: created.id,
        type,
        status: "not_available",
      })),
    });

    return created;
  });

  await ensureWalletForUser(user.id, username);

  const rawToken = generateSecureToken();
  await db.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  // Dev: log verification link (replace with email provider in production)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  console.info(
    `[email-verification] ${appUrl}/${parsed.locale}/verify-email?token=${rawToken}`,
  );

  await writeAuditLog({
    actorUserId: user.id,
    action: "auth.register",
    entityType: "User",
    entityId: user.id,
    ipAddress: meta?.ip,
  });

  return {
    userId: user.id,
    email: user.email,
    username,
    verificationTokenDev: process.env.NODE_ENV === "production" ? undefined : rawToken,
  };
}
