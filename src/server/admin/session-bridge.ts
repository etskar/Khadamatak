import "server-only";

import { db } from "@/lib/db";
import { createAdminSession } from "@/server/admin/auth";

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

    // Centralized session creation (sets the cookie automatically)
    await createAdminSession({
      adminUserId: adminUser.id,
      status: "active",
      setCookie: true,
    });

    // Sync marketplace role so admin nav links appear
    const key = adminUser.role.key;
    const mappedRole = key === "super_admin"
      ? "super_admin"
      : key === "platform_admin"
        ? "admin"
        : "moderator";

    if (["super_admin", "admin", "moderator"].includes(mappedRole)) {
      // Upsert the marketplace User so it mirrors the AdminUser identity.
      // Password hash is synced so the admin CAN log in through the normal
      // login page (NextAuth authorize() checks the User table).
      const existingUser = await db.user.findUnique({ where: { email } });
      if (existingUser) {
        await db.user.update({
          where: { email },
          data: {
            role: mappedRole,
            passwordHash: adminUser.passwordHash,
          },
        });
      } else {
        // First-time bridge — create the marketplace identity
        await db.user.create({
          data: {
            email,
            passwordHash: adminUser.passwordHash,
            role: mappedRole,
            emailVerified: new Date(),
            locale: "ar",
            profile: {
              create: {
                username: email.split("@")[0].replace(/[^a-z0-9_]/gi, "").slice(0, 24),
                displayName: adminUser.name,
              },
            },
          },
        });
      }
    }
  } catch {
    // Best-effort bridge — never fail a sign-in
  }
}
