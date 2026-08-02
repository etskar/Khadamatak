"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { mainNavItems, bottomNavKeys } from "@/config/navigation";
import { cn } from "@/lib/utils";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const t = useTranslations("nav");
  const tA11y = useTranslations("a11y");
  const pathname = usePathname();

  const items = bottomNavKeys
    .map((key) => mainNavItems.find((item) => item.key === key))
    .filter(Boolean);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 glass lg:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label={tA11y("bottomNavigation")}
    >
      <ul className="mx-auto grid h-[var(--bottomnav-height)] max-w-lg grid-cols-5">
        {items.map((item) => {
          if (!item) return null;
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.key} className="min-w-0">
              <Link
                href={item.href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                  active
                    ? "text-brand-600 dark:text-brand-300"
                    : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                    active && "bg-brand-50 dark:bg-brand-800/30",
                  )}
                >
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={active ? 2.35 : 1.85}
                  />
                </span>
                <span className="truncate">{t(item.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
