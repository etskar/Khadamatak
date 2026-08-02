import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

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
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;

    if (!sessionToken) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
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
