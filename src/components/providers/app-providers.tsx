"use client";

import { ToastViewport } from "@/components/ui/toast";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      {children}
      <ToastViewport />
    </>
  );
}
