import "server-only";
import { redirect } from "@/i18n/navigation";
import { getAdminSessionContextOrNull } from "./guard";
import type { AdminContext } from "./rbac";

export type AdminPageGuardResult =
  | { ctx: AdminContext; forbidden: false }
  | { ctx: AdminContext | null; forbidden: true };

/**
 * Guards a server-rendered admin page: redirects to the login screen when the
 * session is missing and reports forbidden when the role lacks permission.
 */
export async function requireAdminPage(
  locale: string,
  permission: string,
): Promise<AdminPageGuardResult> {
  const ctx = await getAdminSessionContextOrNull();
  if (!ctx) {
    redirect({ href: "/admin/login", locale });
    return { ctx: null, forbidden: true };
  }
  if (!ctx.permissions.has(permission)) {
    return { ctx, forbidden: true };
  }
  return { ctx, forbidden: false };
}
