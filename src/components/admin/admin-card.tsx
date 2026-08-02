import type { ReactNode } from "react";

export function AdminCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-muted bg-card p-4 shadow-sm">{children}</div>
  );
}

export function AdminSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold text-foreground">{children}</h3>
  );
}
