"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  resetPasswordAction,
  type ActionResult,
} from "@/server/actions/auth-actions";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false };

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  useEffect(() => {
    if (state?.ok) {
      toast({ title: t("passwordUpdated"), variant: "success" });
      router.push("/login");
    }
  }, [state, router, t]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Input
        name="password"
        type="password"
        autoComplete="new-password"
        label={t("password")}
        leftIcon={<Lock className="h-4 w-4" />}
        required
        minLength={8}
      />
      {state?.error ? (
        <p className="text-sm text-danger">{t("errors.generic")}</p>
      ) : null}
      <Button type="submit" fullWidth size="lg" loading={pending}>
        {t("updatePassword")}
      </Button>
    </form>
  );
}
