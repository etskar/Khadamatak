"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Lock, Mail, ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminLoginAction,
  adminVerify2faAction,
  adminResendOtpAction,
  type AdminActionResult,
} from "@/server/actions/admin-actions";

const initial: AdminActionResult = { ok: false };

export function AdminLoginForm() {
  const t = useTranslations("admin.login");
  const router = useRouter();
  const [loginState, loginAction, loginPending] = useActionState(
    adminLoginAction,
    initial,
  );
  const [otpState, otpAction, otpPending] = useActionState(
    adminVerify2faAction,
    initial,
  );
  const [resendState, resendAction, resendPending] = useActionState(
    adminResendOtpAction,
    initial,
  );

  const loginData = loginState.ok
    ? (loginState.data as { step?: string } | undefined)
    : undefined;
  const needsTwoFactor = loginData?.step === "2fa";

  useEffect(() => {
    if (loginState.ok && loginData?.step === "done") {
      router.push("/admin");
      router.refresh();
    }
    if (otpState.ok) {
      router.push("/admin");
      router.refresh();
    }
  }, [loginState, otpState, router, loginData]);

  if (needsTwoFactor) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-300" />
          {t("twoFactorTitle")}
        </div>
        <p className="text-sm text-muted-foreground">{t("twoFactorSubtitle")}</p>

        <form action={otpAction} className="space-y-4" noValidate>
          <Input
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            label={t("code")}
            placeholder={t("codePlaceholder")}
            required
          />
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="rememberDevice"
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            {t("rememberDevice")}
          </label>

          {otpState.error ? (
            <p
              className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {t(`errors.${otpState.error}`, { defaultValue: otpState.error })}
            </p>
          ) : null}

          <Button type="submit" fullWidth size="lg" loading={otpPending}>
            {t("verify")}
          </Button>
        </form>

        <form action={resendAction}>
          <Button
            type="submit"
            variant="ghost"
            fullWidth
            loading={resendPending}
          >
            <RotateCcw className="h-4 w-4" />
            {t("resendCode")}
          </Button>
        </form>
        {resendState.ok ? (
          <p className="text-center text-xs text-success">{t("codeSent")}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={loginAction} className="space-y-4" noValidate>
      <Input
        name="email"
        type="email"
        autoComplete="email"
        label={t("email")}
        placeholder={t("emailPlaceholder")}
        leftIcon={<Mail className="h-4 w-4" />}
        required
      />
      <Input
        name="password"
        type="password"
        autoComplete="current-password"
        label={t("password")}
        placeholder={t("passwordPlaceholder")}
        leftIcon={<Lock className="h-4 w-4" />}
        required
      />

      {loginState.error ? (
        <p
          className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {t(`errors.${loginState.error}`, { defaultValue: loginState.error })}
        </p>
      ) : null}

      <Button type="submit" fullWidth size="lg" loading={loginPending}>
        {t("signIn")}
      </Button>
    </form>
  );
}
