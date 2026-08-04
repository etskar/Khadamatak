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
      await db.user.updateMany({
        where: { email },
        data: { role: mappedRole },
      });
    }
  } catch {
    // Best-effort bridge — never fail a sign-in
  }
}
