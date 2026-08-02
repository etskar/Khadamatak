import type { ReactNode } from "react";
import "./globals.css";

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
