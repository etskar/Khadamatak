"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { resetUserPasswordAction } from "@/server/actions/admin-actions";

export function AdminResetPasswordButton({ userId }: { userId: string }) {
  const t = useTranslations("admin.actions");
  const tCommon = useTranslations("admin.common");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [temp, setTemp] = useState<string | null>(null);

  async function run() {
    setPending(true);
    const res = await resetUserPasswordAction({ userId });
    setPending(false);
    if (res.ok) {
      const data = res.data as { tempPassword?: string } | undefined;
      setTemp(data?.tempPassword ?? null);
      setOpen(true);
    } else {
      toast({ title: tCommon("error"), description: res.error, variant: "danger" });
    }
  }

  async function copy() {
    if (!temp) return;
    await navigator.clipboard.writeText(temp);
    toast({ title: t("copy"), variant: "success" });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={run}
        loading={pending}
        leftIcon={<KeyRound className="h-4 w-4" />}
      >
        {t("resetPassword")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={t("resetPassword")}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("tempPassword")}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
              {temp}
            </code>
            <Button type="button" variant="outline" onClick={copy}>
              <Copy className="h-4 w-4" />
              {t("copy")}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
