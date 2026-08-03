"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordAction,
  type ActionResult,
} from "@/server/actions/auth-actions";
import { Link } from "@/i18n/navigation";

const initial: ActionResult = { ok: false };

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();

  return (
    <form
      action={(fd) => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setEmailError(t("errors.invalidEmail"));
          return;
        }
        setEmailError(undefined);
        action(fd);
      }}
      className="space-y-4"
      noValidate
    >
      <input type="hidden" name="locale" value={locale} />
      <Input
        name="email"
        type="email"
        autoComplete="email"
        label={t("email")}
        placeholder={t("emailPlaceholder")}
        leftIcon={<Mail className="h-4 w-4" />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={emailError}
        required
      />

      {state?.ok ? (
        <div className="rounded-xl bg-[var(--success-soft)] px-3 py-2 text-sm text-success">
          {t("resetSent")}
          {state.data?.devToken ? (
            <p className="mt-2 break-all text-xs">
              Dev token:{" "}
              <Link
                href={`/reset-password?token=${String(state.data.devToken)}`}
                className="underline"
              >
                {t("openResetLink")}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {state?.error ? (
        <p
          className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {tCommon("errors.generic")}
        </p>
      ) : null}

      <Button type="submit" fullWidth size="lg" loading={pending}>
        {t("sendResetLink")}
      </Button>
    </form>
  );
}
