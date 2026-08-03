/**
 * Runs once when the Next.js server instance starts, before it accepts
 * requests. Validates required environment variables so misconfigured
 * deployments fail loudly at boot instead of at login time.
 */
export async function register() {
  const { requireAuthSecret, getSiteUrl } = await import("@/lib/env");

  requireAuthSecret();

  const url = getSiteUrl();
  const isRender = process.env.RENDER === "true";
  if (
    process.env.NODE_ENV === "production" &&
    isRender &&
    /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url)
  ) {
    throw new Error(
      `[env] AUTH_URL / NEXT_PUBLIC_APP_URL points at "${url}". On Render the app must use the real public domain (e.g. https://khadamatak.onrender.com). Login callbacks, cookies and SEO metadata will break otherwise.`,
    );
  }
}
