"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "./button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title,
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  const t = useTranslations("states.error");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-danger/20 bg-card px-6 py-14 text-center",
        className,
      )}
      role="alert"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-danger">
        <AlertTriangle className="h-8 w-8" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-semibold">{title ?? t("title")}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description ?? t("description")}
      </p>
      {onRetry ? (
        <Button className="mt-6" variant="outline" onClick={onRetry}>
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}
