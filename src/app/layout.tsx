import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
};

type RootLayoutProps = {
  children: ReactNode;
};

/**
 * Root layout is minimal — locale, dir, fonts, and html attrs
 * are applied in app/[locale]/layout.tsx
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return children;
}
