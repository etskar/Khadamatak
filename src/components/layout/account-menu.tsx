"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Settings, UserRound } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

export function AccountMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("nav");
  const { data: session } = useSession();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={ref}
        className="absolute end-2 top-full z-50 mt-1 w-48 overflow-hidden rounded-2xl border border-border bg-card shadow-lg animate-in-up sm:end-4 lg:end-6"
      >
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">{session?.user?.name}</p>
          <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
        </div>
        <div className="p-1.5">
          <button
            type="button"
            onClick={() => { router.push("/profile"); onClose(); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            <UserRound className="h-4 w-4 text-muted-foreground" />
            {t("profile")}
          </button>
          <button
            type="button"
            onClick={() => { router.push("/settings"); onClose(); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            {t("settings")}
          </button>
        </div>
        <div className="border-t border-border p-1.5">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-danger transition hover:bg-[var(--danger-soft)]"
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </button>
        </div>
      </div>
    </>
  );
}
