"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, Menu, MessageCircle, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/shared/logo";
import { IconButton } from "@/components/ui/icon-button";
import { LanguageSwitcher } from "./language-switcher";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

type TopNavProps = {
  className?: string;
};

export function TopNav({ className }: TopNavProps) {
  const t = useTranslations("nav");
  const tHome = useTranslations("home");
  const tA11y = useTranslations("a11y");
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const { data: session } = useSession();
  const locale = useLocale();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/80 glass",
        className,
      )}
    >
      <div className="flex h-[var(--topnav-height)] items-center gap-3 px-3 sm:px-4 lg:px-6">
        <IconButton
          label={tA11y("mainNavigation")}
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </IconButton>

        <div className="lg:hidden">
          <Logo size="sm" />
        </div>

        <div className="mx-auto hidden w-full max-w-xl flex-1 md:block lg:ms-0">
          <Link
            href="/search"
            className="flex h-11 items-center gap-3 rounded-2xl border border-border bg-muted/60 px-4 text-sm text-muted-foreground transition hover:border-brand-300 hover:bg-card"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">{tHome("searchPlaceholder")}</span>
          </Link>
        </div>

        <div className="ms-auto flex items-center gap-1">
          <Link
            href="/search"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition hover:bg-muted md:hidden"
            aria-label={tA11y("search")}
          >
            <Search className="h-5 w-5" />
          </Link>

          <LanguageSwitcher />

          <Link
            href="/messages"
            className="hidden h-11 w-11 items-center justify-center rounded-xl text-foreground transition hover:bg-muted sm:inline-flex"
            aria-label={t("messages")}
          >
            <MessageCircle className="h-5 w-5" />
          </Link>

          <Link
            href="/notifications"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition hover:bg-muted"
            aria-label={tA11y("notifications")}
          >
            <Bell className="h-5 w-5" />
          </Link>

          {session?.user ? (
            <>
              <IconButton
                label={t("logout")}
                className="hidden sm:inline-flex"
                onClick={() =>
                  signOut({ callbackUrl: `/${locale}/login` })
                }
              >
                <LogOut className="h-5 w-5" />
              </IconButton>
              <Link
                href="/profile"
                className="ms-1 inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm ring-2 ring-card"
                aria-label={t("profile")}
              >
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (session.user.name?.[0] ?? "K").toUpperCase()
                )}
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="ms-1 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
