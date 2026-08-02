"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { ToastViewport } from "@/components/ui/toast";
import {
  AdminNavPanel,
  type AdminNavPanelSection,
} from "./admin-nav-panel";
import { AdminLogoutButton } from "./admin-logout-button";

export function AdminShell({
  sections,
  adminName,
  adminEmail,
  roleName,
  children,
}: {
  sections: AdminNavPanelSection[];
  adminName: string;
  adminEmail: string;
  roleName: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("admin.shell");
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminBlock = (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-800/40 dark:text-brand-200">
        {adminName.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">{adminName}</p>
        <p className="truncate text-xs text-muted-foreground leading-tight">
          {roleName}
        </p>
      </div>
      <AdminLogoutButton compact />
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <aside
        className="fixed inset-y-0 start-0 z-40 hidden w-[264px] flex-col border-e border-border bg-card/95 backdrop-blur-xl lg:flex"
        aria-label="Admin navigation"
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
          <Logo size="sm" href="/admin" />
          <span className="text-sm font-bold text-foreground">{t("admin")}</span>
        </div>
        <AdminNavPanel sections={sections} />
        <div className="border-t border-border p-3">{adminBlock}</div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-label={t("close")}
          />
          <div className="absolute inset-y-0 start-0 flex w-[280px] flex-col bg-card">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="text-sm font-bold text-foreground">
                {t("admin")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <AdminNavPanel
              sections={sections}
              onNavigate={() => setMobileOpen(false)}
            />
            <div className="border-t border-border p-3">{adminBlock}</div>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-dvh flex-col lg:ps-[264px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t("menu")}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground lg:hidden">
              <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-300" />
              {t("admin")}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hidden text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300 sm:block"
            >
              {t("backToSite")}
            </Link>
            <div className="hidden sm:block">
              <p className="max-w-[180px] truncate text-sm font-semibold leading-tight text-foreground">
                {adminName}
              </p>
              <p className="max-w-[180px] truncate text-xs text-muted-foreground leading-tight">
                {adminEmail}
              </p>
            </div>
            <AdminLogoutButton />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
