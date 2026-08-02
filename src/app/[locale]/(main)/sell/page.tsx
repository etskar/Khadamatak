import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSellerDashboard } from "@/server/marketplace/dashboard-service";
import { PageHeader } from "@/components/shared/page-header";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
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
    { label: t("statOrders"), value: String(data.stats.orders) },
    { label: t("statSales"), value: String(data.stats.sales) },
    {
      label: t("statEarnings"),
      value: formatMoney(
        data.stats.earningsCents,
        "EUR",
        locale === "ar" ? "ar" : "nl-NL",
      ),
    },
    { label: t("statReviews"), value: String(data.stats.reviews) },
  ];

  return (
    <div className="space-y-5 animate-in-up">
      <PageHeader
        title={t("sellerDashboard")}
        description={t("sellerDashboardSubtitle")}
        actions={
          <div className="flex gap-2">
            <Link
              href="/sell/product"
              className="inline-flex h-10 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              {t("sellProduct")}
            </Link>
            <Link
              href="/sell/service"
              className="inline-flex h-10 items-center rounded-xl border px-3 text-xs font-semibold"
            >
              {t("offerService")}
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
          orders: p._count.orders,
        }))}
        services={data.services.map((s) => ({
          publicId: s.publicId,
          title: s.title,
          status: s.status,
          views: s.viewsCount,
          favorites: s.favoritesCount,
          orders: s._count.orders,
        }))}
        labels={{
          products: t("products"),
          services: t("services"),
          pause: t("pause"),
          activate: t("activate"),
          delete: t("delete"),
        }}
      />
    </div>
  );
}
