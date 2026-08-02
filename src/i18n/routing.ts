import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "nl"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "ar";

export const localeDirection: Record<AppLocale, "rtl" | "ltr"> = {
  ar: "rtl",
  nl: "ltr",
};

export const localeLabels: Record<AppLocale, string> = {
  ar: "العربية",
  nl: "Nederlands",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
