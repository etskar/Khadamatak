"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Mail } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  loginAction,
  type ActionResult,
} from "@/server/actions/auth-actions";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false };

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? `/${locale}`;
  const [state, action, pending] = useActionState(loginAction, initial);
  const { update } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = tCommon("errors.generic");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = t("errors.invalidEmail");
    if (!password) errors.password = tCommon("errors.generic");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  useEffect(() => {
    if (state?.ok) {
      toast({ title: t("loginSuccess"), variant: "success" });
      let active = true;
      (async () => {
        await update();
        if (active) router.push(callbackUrl);
      })();
      return () => {
        active = false;
      };
    }
  }, [state, update, router, callbackUrl, t]);

  const serverError =
    state?.error === "ACCOUNT_NOT_FOUND"
      ? tCommon("errors.ACCOUNT_NOT_FOUND")
      : state?.error === "INVALID_PASSWORD"
        ? tCommon("errors.INVALID_PASSWORD")
        : state?.error === "RATE_LIMITED"
          ? tCommon("errors.RATE_LIMITED")
          : null;

  return (
    <div className="space-y-4">
      {googleEnabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            fullWidth
            size="lg"
            onClick={() => signIn("google", { callbackUrl: `/${locale}` })}
          >
            {t("continueGoogle")}
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("orEmail")}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form
        action={(fd) => {
          if (!validate()) return;
          action(fd);
        }}
        className="space-y-4"
        noValidate
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Input
          name="email"
          type="email"
          autoComplete="email"
          label={t("email")}
          placeholder={t("emailPlaceholder")}
          leftIcon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          required
        />
        <PasswordInput
          name="password"
          autoComplete="current-password"
          label={t("password")}
          placeholder={t("passwordPlaceholder")}
          leftIcon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          required
        />

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              name="remember"
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            {t("rememberMe")}
          </label>
          <Link
            href="/forgot-password"
            className="font-medium text-brand-700 hover:underline dark:text-brand-300"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        {serverError ? (
          <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger" role="alert">
            {serverError}
          </p>
        ) : null}

        <Button type="submit" fullWidth size="lg" loading={pending}>
          {t("loginCta")}
        </Button>
      </form>
    </div>
  );
}

