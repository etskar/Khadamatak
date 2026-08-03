import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Cairo, Plus_Jakarta_Sans } from "next/font/google";
import { routing, localeDirection, type AppLocale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { AuthSessionProvider } from "@/components/providers/session-provider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-app-sans",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-app-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const brandName =
    siteConfig.nameByLocale[locale as keyof typeof siteConfig.nameByLocale] ??
    siteConfig.name;

  return {
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    applicationName: brandName,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      languages: {
        ar: "/ar",
        nl: "/nl",
      },
    },
    openGraph: {
      type: "website",
      siteName: brandName,
      title: t("title"),
      description: t("description"),
      locale: locale === "ar" ? "ar_SA" : "nl_NL",
      url: `${siteConfig.url}/${locale}`,
      images: [`${siteConfig.url}/-/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [`${siteConfig.url}/-/twitter-image`],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0d9488",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = localeDirection[locale as AppLocale];
  const brandName =
    siteConfig.nameByLocale[locale as keyof typeof siteConfig.nameByLocale] ??
    siteConfig.name;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: brandName,
      url: `${siteConfig.url}/${locale}`,
      inLanguage: locale,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: brandName,
      url: siteConfig.url,
      logo: `${siteConfig.url}/logo.png`,
    },
  ];

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${plusJakarta.variable} ${cairo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-dvh bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
