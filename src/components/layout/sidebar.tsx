"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, LogOut, Shield } from "lucide-react";
import { useLocale } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { Link, usePathname } from "@/i18n/navigation";
import { adminNavItems, mainNavItems } from "@/config/navigation";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/routing";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const t = useTranslations("nav");
  const tA11y = useTranslations("a11y");
  const pathname = usePathname();
  const locale = useLocale() as AppLocale;
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { data: session } = useSession();
  const isRtl = locale === "ar";
  const CollapseIcon = isRtl
    ? collapsed
      ? ChevronLeft
      : ChevronRight
    : collapsed
      ? ChevronRight
      : ChevronLeft;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 start-0 z-40 hidden border-e border-border bg-card/95 backdrop-blur-xl transition-[width] duration-300 lg:flex lg:flex-col",
        collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]",
      )}
      aria-label={tA11y("sidebarNavigation")}
    >
      <div
        className={cn(
          "flex h-[var(--topnav-height)] items-center border-b border-border px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Logo showWordmark={!collapsed} size="sm" />
        {!collapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label={collapsed ? tA11y("mainNavigation") : t("settings")}
          >
            <CollapseIcon className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {collapsed ? (
        <div className="flex justify-center border-b border-border py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
          >
            <CollapseIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 no-scrollbar">
        {mainNavItems
          .filter((item) => item.showInSidebar)
          .map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-brand-50 text-brand-700 shadow-xs dark:bg-brand-800/25 dark:text-brand-200"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-0",
                )}
                title={t(item.key)}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform group-hover:scale-105",
                    active && "text-brand-600 dark:text-brand-300",
                  )}
                  strokeWidth={active ? 2.25 : 1.85}
                />
                {!collapsed ? <span>{t(item.key)}</span> : null}
              </Link>
            );
          })}

        <div className="my-3 border-t border-border" />

        {adminNavItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-800/25 dark:text-brand-200"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
              title={t(item.key)}
            >
              <Shield
                className={cn(
                  "h-5 w-5 shrink-0",
                  active && "text-brand-600 dark:text-brand-300",
                )}
                strokeWidth={active ? 2.25 : 1.85}
              />
              {!collapsed ? <span>{t(item.key)}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href={session?.user ? "/profile" : "/login"}
          className={cn(
            "flex items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110",
            collapsed && "px-0",
          )}
        >
          {collapsed
            ? "→"
            : session?.user
              ? session.user.name ?? t("profile")
              : t("login")}
        </Link>
        {session?.user && !collapsed ? (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
