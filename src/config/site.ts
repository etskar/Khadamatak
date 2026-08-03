import { getSiteUrl } from "@/lib/env";

export const siteConfig = {
  name: "Khadamatak",
  nameAr: "خدماتك",
  description: {
    ar: "منصة الخدمات والمجتمع — اكتشف، تواصل، وأنجز.",
    nl: "Het platform voor diensten en community — ontdek, verbind en presteer.",
  },
  url: getSiteUrl(),
  defaultLocale: "ar" as const,
  locales: ["ar", "nl"] as const,
} as const;
