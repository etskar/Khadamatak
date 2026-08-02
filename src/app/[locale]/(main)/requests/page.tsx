import { getTranslations, setRequestLocale } from "next-intl/server";
import { listRequests } from "@/server/marketplace/request-service";
import { PageHeader } from "@/components/shared/page-header";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardList } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Avatar } from "@/components/ui/avatar";

export default async function RequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const feed = await listRequests({ q: sp.q });

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("requests")}
        description={t("requestsSubtitle")}
        actions={
          <Link
            href="/requests/new"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {t("createRequest")}
          </Link>
        }
      />
      {feed.items.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t("noRequests")} description={t("noRequestsDesc")} />
      ) : (
        <div className="space-y-3">
          {feed.items.map((r) => (
            <Link key={r.id} href={`/requests/${r.publicId}`}>
              <Card className="transition hover:shadow-md">
                <CardContent className="flex items-start gap-3 p-4">
                  <Avatar
                    src={r.owner.profile?.avatarUrl}
                    fallback={r.owner.profile?.displayName ?? "U"}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{r.title}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {r.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[r.startLocation, r.destination].filter(Boolean).join(" → ")}
                      {r.budgetCents != null
                        ? ` · ${formatMoney(r.budgetCents, r.currency, locale === "ar" ? "ar" : "nl-NL")}`
                        : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
