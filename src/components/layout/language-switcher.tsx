"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  localeLabels,
  locales,
  type AppLocale,
} from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updatePreferencesAction } from "@/server/actions/profile-actions";

type LanguageSwitcherProps = {
  variant?: "compact" | "full";
  className?: string;
};

export function LanguageSwitcher({
  variant = "compact",
  className,
}: LanguageSwitcherProps) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, update } = useSession();

  const switchLocale = async (next: AppLocale) => {
    if (next === locale) return;
    if (session?.user) {
      const fd = new FormData();
      fd.set("locale", next);
      try {
        await updatePreferencesAction(fd);
        await update({ locale: next });
      } catch {
        /* still switch UI locale */
      }
    }
    router.replace(pathname, { locale: next });
  };

  if (variant === "full") {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        {locales.map((item) => (
          <Button
            key={item}
            type="button"
            variant={item === locale ? "primary" : "outline"}
            onClick={() => void switchLocale(item)}
            aria-pressed={item === locale}
          >
            {localeLabels[item]}
          </Button>
        ))}
      </div>
    );
  }

  const nextLocale = locale === "ar" ? "nl" : "ar";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => void switchLocale(nextLocale)}
      aria-label={`${t("language")}: ${localeLabels[nextLocale]}`}
      title={localeLabels[nextLocale]}
    >
      <Languages className="h-5 w-5" />
    </Button>
  );
}
