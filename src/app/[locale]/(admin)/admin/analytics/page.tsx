import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Users,
  UserPlus,
  ShoppingBag,
  Handshake,
  Banknote,
  TrendingUp,
  Users2,
  MessageSquare,
  Flag,
  Scale,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getAdminAnalytics } from "@/server/admin/analytics";
import { formatMoney } from "@/lib/money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.analytics")} · ${t("title")}` };
}

export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { forbidden } = await requireAdminPage(locale, "analytics.view");
  if (forbidden) return <AccessDenied />;

  const a = await getAdminAnalytics();

  const cards = [
    { label: t("analytics.totalUsers"), value: a.users.total.toLocaleString(localeFmt), icon: <Users className="h-5 w-5" />, hint: `+${a.users.newToday} ${t("analytics.today")}` },
    { label: t("analytics.newUsers7d"), value: a.users.new7d.toLocaleString(localeFmt), icon: <UserPlus className="h-5 w-5" />, hint: `+${a.users.newToday} ${t("analytics.today")}` },
    { label: t("analytics.totalOrders"), value: a.marketplace.totalOrders.toLocaleString(localeFmt), icon: <ShoppingBag className="h-5 w-5" />, hint: `${t("analytics.completed")}: ${a.marketplace.completedOrders}` },
    { label: t("analytics.avgOrder"), value: formatMoney(a.marketplace.avgOrderCents, "EUR", localeFmt), icon: <TrendingUp className="h-5 w-5" /> },
    { label: t("analytics.totalRevenue"), value: formatMoney(a.finance.totalRevenueCents, "EUR", localeFmt), icon: <Banknote className="h-5 w-5" />, hint: `${t("analytics.last7d")}: ${formatMoney(a.finance.revenue7dCents, "EUR", localeFmt)}` },
    { label: t("analytics.totalDeals"), value: a.deals.total.toLocaleString(localeFmt), icon: <Handshake className="h-5 w-5" /> },
    { label: t("analytics.activeGroups"), value: a.community.activeGroups.toLocaleString(localeFmt), icon: <Users2 className="h-5 w-5" />, hint: `+${a.community.newGroups7d} ${t("analytics.last7d")}` },
    { label: t("analytics.totalPosts"), value: a.community.totalPosts.toLocaleString(localeFmt), icon: <MessageSquare className="h-5 w-5" />, hint: `+${a.community.newPosts7d} ${t("analytics.last7d")}` },
    { label: t("analytics.openReports"), value: a.health.openReports.toLocaleString(localeFmt), icon: <Flag className="h-5 w-5" /> },
    { label: t("analytics.openDisputes"), value: a.health.openDisputes.toLocaleString(localeFmt), icon: <Scale className="h-5 w-5" /> },
  ];

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.analytics")} description={t("analytics.subtitle")} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  );
}
