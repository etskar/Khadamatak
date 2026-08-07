"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { X, LogOut, Shield } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { adminNavItems, mainNavItems, bottomNavKeys } from "@/config/navigation";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { canAccessAdmin } from "@/lib/permissions";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileDrawer() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const open = useUiStore((s) => s.mobileMenuOpen);
  const setOpen = useUiStore((s) => s.setMobileMenuOpen);
  const { data: session } = useSession();
  const locale = useLocale();

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay)] animate-fade-in"
        aria-label={tCommon("closeMenu")}
        onClick={() => setOpen(false)}
      />
      <div className="absolute inset-y-0 start-0 flex w-[min(20rem,88vw)] flex-col bg-card shadow-xl animate-in-up">
        <div className="flex h-[var(--topnav-height)] items-center justify-between border-b border-border px-4">
          <Logo size="sm" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            aria-label={tCommon("closeMenu")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {mainNavItems
            .filter((item) => item.showInSidebar && !bottomNavKeys.includes(item.key as never))
            .map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-800/25 dark:text-brand-200"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.85} />
                  {t(item.key)}
                </Link>
              );
            })}

          <div className="my-2 border-t border-border" />

          {session?.user?.role && canAccessAdmin(session.user.role)
            ? adminNavItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
                      active
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-800/25"
                        : "hover:bg-muted",
                    )}
                  >
                    <Shield className="h-5 w-5" />
                    {t(item.key)}
                  </Link>
                );
              })
            : null}
        </nav>

        <div className="space-y-3 border-t border-border p-4">
          <p className="text-xs font-medium text-muted-foreground">
            {tCommon("language")}
          </p>
          <LanguageSwitcher variant="full" />
          {session?.user ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          ) : (
            <Link
              href="/login"
              className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
