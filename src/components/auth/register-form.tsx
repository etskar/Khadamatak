"use client";

import { useActionState, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Mail, Phone, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  registerAction,
  type ActionResult,
} from "@/server/actions/auth-actions";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false };

type FieldErrors = {
  fullName?: string;
  username?: string;
  email?: string;
  password?: string;
};

export function RegisterForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [state, action, pending] = useActionState(registerAction, initial);
  const { update } = useSession();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!fullName.trim()) errors.fullName = tCommon("errors.generic");
    if (!/^[a-z0-9_]{3,24}$/i.test(username.trim()))
      errors.username = t("errors.invalidUsername");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = t("errors.invalidEmail");
    if (password.length < 8) errors.password = t("errors.weakPassword");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  useEffect(() => {
    if (state?.ok) {
      toast({
        title: t("registerSuccess"),
        description: t("checkEmail"),
        variant: "success",
      });
      (async () => {
        await update();
        router.push("/");
        router.refresh();
      })();
    }
  }, [state, router, t, update]);

  const serverError = state?.error
    ? tCommon(`errors.${state.error}`, { defaultValue: t("errors.generic") })
    : null;

  return (
    <form
      action={(fd) => {
        if (!validate()) return;
        action(fd);
      }}
      className="space-y-4"
      noValidate
    >
      <input type="hidden" name="locale" value={locale} />
      <Input
        name="fullName"
        type="text"
        autoComplete="name"
        label={t("fullName")}
        placeholder={t("fullNamePlaceholder")}
        leftIcon={<User className="h-4 w-4" />}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={fieldErrors.fullName}
        required
      />
      <Input
        name="username"
        type="text"
        autoComplete="username"
        label={t("username")}
        placeholder={t("usernamePlaceholder")}
        leftIcon={<User className="h-4 w-4" />}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={fieldErrors.username}
        required
      />
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
      <Input
        name="phone"
        type="tel"
        autoComplete="tel"
        label={t("phone")}
        placeholder={t("phonePlaceholder")}
        leftIcon={<Phone className="h-4 w-4" />}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <PasswordInput
        name="password"
        autoComplete="new-password"
        label={t("password")}
        placeholder={t("passwordPlaceholder")}
        leftIcon={<Lock className="h-4 w-4" />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        required
        minLength={8}
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("termsPrefix")}{" "}
        <span className="font-medium text-foreground">{t("terms")}</span>{" "}
        {tCommon("and")}{" "}
        <span className="font-medium text-foreground">{t("privacy")}</span>.
      </p>

      {serverError ? (
        <p
          className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {serverError}
        </p>
      ) : null}

      <Button type="submit" fullWidth size="lg" loading={pending}>
        {t("registerCta")}
      </Button>
    </form>
  );
}
