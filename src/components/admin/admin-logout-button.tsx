"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminLogoutAction } from "@/server/actions/admin-actions";

export function AdminLogoutButton({ compact }: { compact?: boolean }) {
  const t = useTranslations("admin.shell");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await adminLogoutAction();
    router.refresh();
    router.push("/admin/login");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "sm" : "md"}
      onClick={handleLogout}
      loading={pending}
    >
      {!pending ? <LogOut className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
      {!compact ? t("logout") : null}
    </Button>
  );
}
