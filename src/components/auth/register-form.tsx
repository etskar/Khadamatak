"use client";

import { useActionState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Mail, Phone, User } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  registerAction,
  type ActionResult,
} from "@/server/actions/auth-actions";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false };

export function RegisterForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [state, action, pending] = useActionState(registerAction, initial);

  useEffect(() => {
    if (state?.ok) {
      toast({
        title: t("registerSuccess"),
        description: t("checkEmail"),
        variant: "success",
      });
      router.push("/");
      router.refresh();
    }
  }, [state, router, t]);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Input
        name="fullName"
        type="text"
        autoComplete="name"
        label={t("fullName")}
        placeholder={t("fullNamePlaceholder")}
        leftIcon={<User className="h-4 w-4" />}
        required
      />
      <Input
        name="username"
        type="text"
        autoComplete="username"
        label={t("username")}
        placeholder={t("usernamePlaceholder")}
        leftIcon={<User className="h-4 w-4" />}
        required
      />
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
        name="phone"
        type="tel"
        autoComplete="tel"
        label={t("phone")}
        placeholder={t("phonePlaceholder")}
        leftIcon={<Phone className="h-4 w-4" />}
      />
      <Input
        name="password"
        type="password"
        autoComplete="new-password"
        label={t("password")}
        placeholder={t("passwordPlaceholder")}
        leftIcon={<Lock className="h-4 w-4" />}
        required
        minLength={8}
      />
      <Input
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        label={t("confirmPassword")}
        placeholder={t("passwordPlaceholder")}
        leftIcon={<Lock className="h-4 w-4" />}
        required
        minLength={8}
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("termsPrefix")}{" "}
        <span className="font-medium text-foreground">{t("terms")}</span>{" "}
        {tCommon("and")}{" "}
        <span className="font-medium text-foreground">{t("privacy")}</span>.
      </p>

      {state?.error ? (
        <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger" role="alert">
          {t(`errors.${state.error}`, { defaultValue: t("errors.generic") })}
        </p>
      ) : null}

      <Button type="submit" fullWidth size="lg" loading={pending}>
        {t("registerCta")}
      </Button>
    </form>
  );
}
