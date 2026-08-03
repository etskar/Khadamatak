"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import {
  resetPasswordAction,
  type ActionResult,
} from "@/server/actions/auth-actions";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false };

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});

  function validate(): boolean {
    const errors: { password?: string; confirm?: string } = {};
    if (password.length < 8) errors.password = t("errors.weakPassword");
    if (confirm !== password) errors.confirm = t("errors.mismatch");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  useEffect(() => {
    if (state?.ok) {
      toast({ title: t("passwordUpdated"), variant: "success" });
      router.push("/login");
    }
  }, [state, router, t]);

  const serverError =
    state?.error === "TOKEN_INVALID" || state?.error === "WEAK_PASSWORD"
      ? tCommon(`errors.${state.error}`, { defaultValue: tCommon("errors.generic") })
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
      <input type="hidden" name="token" value={token} />
      <PasswordInput
        name="password"
        autoComplete="new-password"
        label={t("password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        required
        minLength={8}
      />
      <PasswordInput
        name="confirmPassword"
        autoComplete="new-password"
        label={t("confirmPassword")}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={fieldErrors.confirm}
        required
        minLength={8}
      />
      {serverError ? (
        <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger" role="alert">
          {serverError}
        </p>
      ) : null}
      <Button type="submit" fullWidth size="lg" loading={pending}>
        {t("updatePassword")}
      </Button>
    </form>
  );
}
