import "server-only";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { generateSecureToken, hashToken } from "@/lib/crypto";
import { ADMIN_SESSION_COOKIE } from "@/server/admin/rbac";

/**
 * Best-effort admin‑panel bridge.
 *
 * When a marketplace user (User table) whose email matches an active
 * AdminUser signs in, this helper creates a `khadamatak_admin` session
 * and syncs the User.role so admin links (canAccessAdmin) become visible.
 *
 * Safe to call from any server context — never throws.
 */
export async function connectAdminSession(email: string) {
  if (!email) return;
  try {
    const adminUser = await db.adminUser.findUnique({
      where: { email },
      include: { role: true },
    });
    if (!adminUser || adminUser.status !== "active") return;

    // Create admin session cookie
    const adminToken = generateSecureToken(32);
    await db.adminSession.create({
      data: {
        adminUserId: adminUser.id,
        tokenHash: hashToken(adminToken),
        status: "active",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(),
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, adminToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    // Sync marketplace role so admin nav links appear
    const key = adminUser.role.key;
    const mappedRole = key === "super_admin"
      ? "super_admin"
      : key === "platform_admin"
        ? "admin"
        : "moderator";

    if (["super_admin", "admin", "moderator"].includes(mappedRole)) {
      await db.user.updateMany({
        where: { email },
        data: { role: mappedRole },
      });
    }
  } catch {
    // Best-effort bridge — never fail a sign-in
  }
}
