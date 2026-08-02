"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof Badge>["variant"]>;

const statusVariantMap: Record<string, BadgeVariant> = {
  // positive
  active: "success",
  verified: "success",
  completed: "success",
  paid: "success",
  funded: "success",
  delivered: "success",
  released: "success",
  published: "success",
  sent: "success",
  accepted: "success",
  resolved: "success",
  // neutral / warning
  pending: "warning",
  pending_2fa: "warning",
  under_review: "warning",
  reviewing: "warning",
  payment_pending: "warning",
  in_progress: "warning",
  processing: "warning",
  scheduled: "warning",
  featured: "warning",
  frozen: "warning",
  assigned: "warning",
  escalated: "warning",
  medium: "warning",
  // negative
  suspended: "danger",
  banned: "danger",
  failed: "danger",
  rejected: "danger",
  disputed: "danger",
  cancelled: "danger",
  canceled: "danger",
  locked: "danger",
  revoked: "danger",
  expired: "danger",
  critical: "danger",
  high: "danger",
  // muted
  hidden: "secondary",
  draft: "secondary",
  inactive: "secondary",
  closed: "secondary",
  low: "secondary",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("admin.status");
  const variant = statusVariantMap[status] ?? "default";
  return (
    <Badge variant={variant}>
      {t(status, { defaultValue: status.replaceAll("_", " ") })}
    </Badge>
  );
}
