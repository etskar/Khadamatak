import { sha256 } from "@/lib/crypto";

export type RequestInfo = {
  ipAddress: string | null;
  userAgent: string | null;
  deviceHash: string | null;
  country: string | null;
  city: string | null;
};

/**
 * Build a stable device hash from user agent (best effort).
 * Used for trusted-device verification and multi-device detection.
 */
export function hashDevice(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  return sha256(userAgent).slice(0, 32);
}

/**
 * Extract request metadata from headers. Used by admin auth and audit logging.
 * Accepts either a plain header record or the `ReadonlyHeaders` object returned
 * by `headers()` from "next/headers".
 */
export function buildRequestInfo(
  source: Readonly<Record<string, string | null | undefined>> | { get(name: string): string | null },
): RequestInfo {
  const get = (name: string): string | null => {
    if (typeof source === "object" && source !== null && "get" in source) {
      return (source as { get(name: string): string | null }).get(name) ?? null;
    }
    return (source as Record<string, string | null | undefined>)[name] ?? null;
  };

  const userAgent = get("user-agent");
  const xForwardedFor = get("x-forwarded-for");
  const cfIpCountry = get("cf-ipcountry") ?? get("x-vercel-ip-country");
  const cfCity = get("x-vercel-ip-city");

  const ipAddress = xForwardedFor?.split(",")[0]?.trim() ?? get("x-real-ip");

  return {
    ipAddress,
    userAgent,
    deviceHash: hashDevice(userAgent),
    country: cfIpCountry ?? null,
    city: cfCity ?? null,
  };
}
