"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { markNotificationsReadAction } from "@/server/actions/social-actions";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsClient({ items }: { items: Item[] }) {
  const t = useTranslations("notifications");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("title")}
        actions={
          items.some((i) => !i.readAt) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  await markNotificationsReadAction();
                  router.refresh();
                })
              }
            >
              {t("markAllRead")}
            </Button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const content = (
              <div
                className={cn(
                  "rounded-2xl border border-border px-4 py-3 transition hover:bg-muted/40",
                  !item.readAt && "border-brand-200 bg-brand-50/40 dark:bg-brand-950/20",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t(`types.${item.type}`, { defaultValue: item.type })} ·{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!item.readAt ? (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                  ) : null}
                </div>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href as "/"}>
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
