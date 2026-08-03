/**
 * Environment validation — fail loudly at startup instead of failing
 * silently at login time (e.g. NextAuth "MissingSecret").
 */

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const isServer = typeof window === "undefined";

/**
 * The site's canonical public origin. Priority:
 *   AUTH_URL (Auth.js canonical URL) > NEXT_PUBLIC_APP_URL (public origin)
 *
 * In production runtime (next start) a missing or localhost origin is a hard
 * error — it breaks login callbacks and SEO metadata. It is resolved lazily
 * so client bundles can still inline NEXT_PUBLIC_APP_URL at build time.
 */
export function getSiteUrl(): string {
  const url =
    process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";

  if (url) {
    const clean = url.replace(/\/+$/, "");
    if (!/^https?:\/\//.test(clean)) {
      throw new Error(
        `[env] Invalid site URL "${clean}". AUTH_URL / NEXT_PUBLIC_APP_URL must start with http:// or https://.`,
      );
    }
    return clean;
  }

  if (isServer && process.env.NODE_ENV === "production" && !isBuildPhase) {
    throw new Error(
      "[env] Missing site URL. Set AUTH_URL and NEXT_PUBLIC_APP_URL to the real production domain (e.g. https://khadamatak.onrender.com) in your Render service environment. login callbacks and SEO metadata will not work without them.",
    );
  }

  return "http://localhost:3000";
}

/**
 * Require AUTH_SECRET. Throws immediately with a clear message when the
 * server is missing it — never let Auth.js die with an opaque "MissingSecret"
 * error at login time.
 */
export function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "[env] Missing AUTH_SECRET. Generate one (e.g. `openssl rand -base64 32`) and set it in your environment variables (Render Dashboard → Environment → AUTH_SECRET). The app refuses to start without it.",
    );
  }
  if (secret.length < 32) {
    throw new Error(
      "[env] AUTH_SECRET is too short (minimum 32 characters). Generate a strong random secret.",
    );
  }
  return secret;
}
