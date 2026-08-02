"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { AdminActionResult } from "@/server/actions/admin-actions";

export function AdminExportButton({
  action,
  filename,
  label,
  disabled,
}: {
  action: () => Promise<AdminActionResult<{ csv: string }>>;
  filename: string;
  label: string;
  disabled?: boolean;
}) {
  const t = useTranslations("admin.common");
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    const res = await action();
    setPending(false);
    if (!res.ok || !res.data?.csv) {
      toast({ title: t("error"), description: res.error, variant: "danger" });
      return;
    }
    const blob = new Blob(["\ufeff" + res.data.csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t("success"), variant: "success" });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={run}
      loading={pending}
      disabled={disabled}
      leftIcon={<Download className="h-4 w-4" />}
    >
      {label}
    </Button>
  );
}
