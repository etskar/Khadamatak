"use client";

import { useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Mail } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loginAction,
  type ActionResult,
} from "@/server/actions/auth-actions";

const initial: ActionResult = { ok: false };

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? `/${locale}`;
  const [state, action, pending] = useActionState(loginAction, initial);
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      let active = true;
      (async () => {
        await update();
        if (active) router.push(callbackUrl);
      })();
      return () => {
        active = false;
      };
    }
  }, [state, update, router, callbackUrl]);

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

      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
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

        {state?.error ? (
          <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger" role="alert">
            {state.error === "INVALID_CREDENTIALS"
              ? t("errors.INVALID_CREDENTIALS")
              : state.error === "RATE_LIMITED"
                ? t("errors.RATE_LIMITED")
                : t("errors.generic")}
          </p>
        ) : null}

        <Button type="submit" fullWidth size="lg" loading={pending}>
          {t("loginCta")}
        </Button>
      </form>
    </div>
  );
}
