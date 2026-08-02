export const siteConfig = {
  name: "Khadamatak",
  nameAr: "خدماتك",
  description: {
    ar: "منصة الخدمات والمجتمع — اكتشف، تواصل، وأنجز.",
    nl: "Het platform voor diensten en community — ontdek, verbind en presteer.",
  },
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  defaultLocale: "ar" as const,
  locales: ["ar", "nl"] as const,
} as const;
