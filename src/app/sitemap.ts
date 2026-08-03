import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

const publicPaths = [
  "",
  "/search",
  "/products",
  "/services",
  "/requests",
  "/login",
  "/register",
  "/forgot-password",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;

  return siteConfig.locales.flatMap((locale) =>
    publicPaths.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          siteConfig.locales.map((l) => [l, `${base}/${l}${path}`]),
        ),
      },
    })),
  );
}
