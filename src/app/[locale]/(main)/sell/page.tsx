import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSellerDashboard } from "@/server/marketplace/dashboard-service";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PrimaryAction } from "@/components/ui/primary-action";
import { PackagePlus, Wrench, Building2 } from "lucide-react";
import { SellerListingsClient } from "@/components/marketplace/seller-listings-client";

export default async function SellDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/sell`);
  }
  const t = await getTranslations("marketplace");
  const data = await getSellerDashboard(session.user.id);

  const stats = [
    { label: t("statViews"), value: String(data.stats.views) },
    { label: t("statFavorites"), value: String(data.stats.favorites) },
    { label: t("statListings"), value: String(data.stats.activeListings) },
  ];

  return (
    <div className="space-y-5 animate-in-up">
      <PageHeader
        title={t("sellerDashboard")}
        description={t("sellerDashboardSubtitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <PrimaryAction href="/sell/product" icon={PackagePlus} label={t("sellProduct")} />
            <PrimaryAction href="/sell/service" icon={Wrench} label={t("offerService")} variant="outline" />
            <PrimaryAction href="/sell/job" icon={Building2} label={t("postJob")} variant="outline" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-sm font-bold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SellerListingsClient
        products={data.products.map((p) => ({
          publicId: p.publicId,
          title: p.title,
          status: p.status,
          views: p.viewsCount,
          favorites: p.favoritesCount,
        }))}
        services={data.services.map((s) => ({
          publicId: s.publicId,
          title: s.title,
          status: s.status,
          views: s.viewsCount,
          favorites: s.favoritesCount,
        }))}
        jobs={data.jobs.map((j) => ({
          publicId: j.publicId,
          title: j.title,
          status: j.status,
          views: j.viewsCount,
        }))}
        labels={{
          products: t("products"),
          services: t("services"),
          jobs: t("jobs"),
          pause: t("pause"),
          activate: t("activate"),
          delete: t("delete"),
          share: t("share"),
          linkCopied: t("linkCopied"),
          searchPlaceholder: t("searchMyListings"),
          allStatuses: t("allStatuses"),
          statusActive: t("statusActive"),
          statusPaused: t("statusPaused"),
          statusDeleted: t("statusDeleted"),
          items: t("items"),
          noResults: t("noResults"),
        }}
      />
    </div>
  );
}
