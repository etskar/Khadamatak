import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Users,
  UserCheck,
  BadgeCheck,
  Store,
  Handshake,
  Lock,
  Wallet,
  TrendingUp,
  Percent,
  Scale,
  Headphones,
  Flag,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getDashboardStats } from "@/server/admin/stats";
import { formatMoney } from "@/lib/money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("title") };
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const { forbidden } = await requireAdminPage(locale, "dashboard.view");
  if (forbidden) return <AccessDenied />;

  const stats = await getDashboardStats();

  const cards = [
    {
      label: t("dashboard.totalUsers"),
      value: stats.totalUsers.toLocaleString(locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <Users className="h-5 w-5" />,
      hint: `${t("dashboard.onlineUsers")}: ${stats.onlineUsers}`,
    },
    {
      label: t("dashboard.verifiedUsers"),
      value: stats.verifiedUsers.toLocaleString(locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <BadgeCheck className="h-5 w-5" />,
      hint: `${t("dashboard.pendingVerifications")}: ${stats.pendingVerifications}`,
    },
    {
      label: t("dashboard.listings"),
      value: stats.totalListings.toLocaleString(locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <Store className="h-5 w-5" />,
      hint: `${stats.activeProducts} / ${stats.activeServices}`,
    },
    {
      label: t("dashboard.activeDeals"),
      value: stats.activeDeals.toLocaleString(locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <Handshake className="h-5 w-5" />,
      hint: `${t("dashboard.activeOrders")}: ${stats.activeOrders}`,
    },
    {
      label: t("dashboard.escrowBalance"),
      value: formatMoney(stats.escrowBalanceCents, "EUR", locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <Lock className="h-5 w-5" />,
    },
    {
      label: t("dashboard.walletBalance"),
      value: formatMoney(stats.walletBalanceCents, "EUR", locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <Wallet className="h-5 w-5" />,
    },
    {
      label: t("dashboard.revenueToday"),
      value: formatMoney(stats.revenueTodayCents, "EUR", locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <TrendingUp className="h-5 w-5" />,
      hint: `${t("dashboard.revenueMonth")}: ${formatMoney(stats.revenueMonthCents, "EUR", locale === "ar" ? "ar-EG" : "nl-NL")}`,
    },
    {
      label: t("dashboard.commission"),
      value: formatMoney(stats.commissionCents, "EUR", locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <Percent className="h-5 w-5" />,
    },
    {
      label: t("dashboard.openDisputes"),
      value: stats.openDisputes.toLocaleString(locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <Scale className="h-5 w-5" />,
    },
    {
      label: t("dashboard.supportTickets"),
      value: stats.supportTickets.toLocaleString(locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <Headphones className="h-5 w-5" />,
    },
    {
      label: t("dashboard.reportsWaiting"),
      value: stats.reportsWaiting.toLocaleString(locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <Flag className="h-5 w-5" />,
    },
    {
      label: t("dashboard.pendingVerifications"),
      value: stats.pendingVerifications.toLocaleString(locale === "ar" ? "ar-EG" : "nl-NL"),
      icon: <UserCheck className="h-5 w-5" />,
    },
  ];

  return (
    <div className="animate-in-up">
      <PageHeader title={t("title")} description={t("dashboard.subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  );
}
