/**
 * Admin session cookie name — single source of truth.
 *
 * Imported by both server-only modules (rbac, session-bridge, auth)
 * and edge middleware (proxy.ts).  This file MUST NOT import any
 * server-only or Node.js dependencies.
 */
export const ADMIN_SESSION_COOKIE = "khadamatak_admin";

/** Absolute session lifetime (milliseconds). */
export const ADMIN_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

/** Idle timeout before a session is marked expired. */
export const ADMIN_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12h

/** Maximum number of concurrent active sessions per admin. */
export const ADMIN_MAX_SESSIONS = 10;

/** Sample rate for background cleanup (1 in N requests). */
export const ADMIN_CLEANUP_SAMPLE_RATE = 100;

/** Sessions older than this (ms) are eligible for hard-deletion. */
export const ADMIN_CLEANUP_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days after expiry
