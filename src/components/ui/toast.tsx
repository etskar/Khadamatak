"use client";

import * as React from "react";
import { create } from "zustand";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type ToastVariant = "default" | "success" | "warning" | "danger";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastStore = {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ].slice(-4),
    })),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function toast(input: Omit<ToastItem, "id">) {
  useToastStore.getState().push(input);
}

const variantStyles: Record<ToastVariant, string> = {
  default: "border-border",
  success: "border-success/30",
  warning: "border-warning/30",
  danger: "border-danger/30",
};

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore();

  React.useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((item) =>
      window.setTimeout(() => dismiss(item.id), 4200),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, dismiss]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto w-full max-w-sm animate-in-up rounded-2xl border bg-card p-4 shadow-lg",
            variantStyles[item.variant ?? "default"],
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.description ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => dismiss(item.id)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
