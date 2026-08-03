import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Must stay in sync with src/server/admin/rbac.ts ADMIN_SESSION_COOKIE.
 * (Can't import it here — rbac.ts is server-only and pulls in Prisma.)
 */
const ADMIN_SESSION_COOKIE = "khadamatak_admin";

const protectedPaths = [
  "/wallet",
  "/messages",
  "/notifications",
  "/settings",
  "/verification",
  "/admin",
  "/sell",
  "/orders",
  "/deals",
  "/favorites",
  "/requests/new",
];

export default function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const locale = routing.locales.includes(maybeLocale as "ar" | "nl")
    ? maybeLocale
    : routing.defaultLocale;
  const pathWithoutLocale = routing.locales.includes(maybeLocale as "ar" | "nl")
    ? `/${segments.slice(1).join("/")}`
    : pathname;

  const isProtected = protectedPaths.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );

  if (isProtected) {
    const isAdminRoute =
      pathWithoutLocale === "/admin" || pathWithoutLocale.startsWith("/admin/");
    const isAdminLogin = pathWithoutLocale === "/admin/login";

    if (isAdminRoute && !isAdminLogin) {
      // Admin panel is gated by its own session cookie — admins do not need a
      // marketplace (NextAuth) session, and /admin/login must stay public so
      // admins without a user account can reach the login form.
      const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
      if (!adminToken) {
        const loginUrl = new URL(`/${locale}/admin/login`, request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
    } else if (!isAdminLogin) {
      // Marketplace routes are gated by the NextAuth user session cookie.
      const sessionToken =
        request.cookies.get("authjs.session-token")?.value ||
        request.cookies.get("__Secure-authjs.session-token")?.value;

      if (!sessionToken) {
        const loginUrl = new URL(`/${locale}/login`, request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/(ar|nl)/:path*",
    "/((?!api|_next|_vercel|.*\\..*|apple-icon|opengraph-image|twitter-image).*)",
  ],
};
