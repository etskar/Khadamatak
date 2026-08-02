"use client";

import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { BottomNav } from "./bottom-nav";
import { MobileDrawer } from "./mobile-drawer";
import { ToastViewport } from "@/components/ui/toast";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />
      <MobileDrawer />
      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-300",
          sidebarCollapsed
            ? "lg:ps-[var(--sidebar-collapsed)]"
            : "lg:ps-[var(--sidebar-width)]",
        )}
      >
        <TopNav />
        <main
          id="main-content"
          className="flex-1 px-3 pb-[calc(var(--bottomnav-height)+var(--safe-bottom)+1rem)] pt-4 sm:px-4 lg:px-6 lg:pb-8"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <BottomNav />
      </div>
      <ToastViewport />
    </div>
  );
}
