"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerUser } from "@/server/auth/register";
import {
  requestPasswordReset,
  resetPassword,
  verifyEmailToken,
} from "@/server/users/verification-service";
import { rateLimit } from "@/lib/rate-limit";
import { connectAdminSession } from "@/server/admin/session-bridge";

export type ActionResult = {
  ok: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const password = String(formData.get("password") ?? "");

    const result = await registerUser({
      email: String(formData.get("email") ?? ""),
      password,
      fullName: String(formData.get("fullName") ?? ""),
      username: String(formData.get("username") ?? ""),
      phone: String(formData.get("phone") ?? "") || undefined,
      locale: (String(formData.get("locale") ?? "ar") as "ar" | "nl") || "ar",
    });

    await signIn("credentials", {
      email: result.email,
      password,
      redirect: false,
    });

    return {
      ok: true,
      data: {
        username: result.username,
        verificationTokenDev: result.verificationTokenDev,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "REGISTER_FAILED";
    return { ok: false, error: msg };
  }
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  const callbackUrl = String(formData.get("callbackUrl") ?? `/${locale}`);

  if (!email || !password) {
    return { ok: false, error: "MISSING_FIELDS" };
  }

  const rl = await rateLimit(`login:${email}`, 20, 15 * 60_000);
  if (!rl.success) return { ok: false, error: "RATE_LIMITED" };

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    // Bridge to the admin panel when an active AdminUser exists
    await connectAdminSession(email);

    return { ok: true, data: { callbackUrl } };
  } catch (e) {
    if (e instanceof AuthError) {
      const existing = await db.user.findFirst({
        where: {
          OR: [{ email }, { profile: { username: email } }],
        },
      });
      if (!existing) return { ok: false, error: "ACCOUNT_NOT_FOUND" };
      return { ok: false, error: "INVALID_PASSWORD" };
    }
    // NEXT_REDIRECT
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "LOGIN_FAILED" };
  }
}

export async function logoutAction(locale: string) {
  await signOut({ redirectTo: `/${locale}/login` });
}

export async function forgotPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const email = String(formData.get("email") ?? "");
    const locale = String(formData.get("locale") ?? "ar");
    const result = await requestPasswordReset(email, locale);
    return { ok: true, data: { devToken: result.devToken } };
  } catch {
    return { ok: false, error: "RESET_FAILED" };
  }
}

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await resetPassword(
      String(formData.get("token") ?? ""),
      String(formData.get("password") ?? ""),
    );
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "RESET_FAILED",
    };
  }
}

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  try {
    await verifyEmailToken(token);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "VERIFY_FAILED",
    };
  }
}
