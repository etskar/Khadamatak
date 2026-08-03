import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Users,
  UserCheck,
  BadgeCheck,
  Store,
  Package,
  Wrench,
  Headphones,
  Flag,
  Users2,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getDashboardStats } from "@/server/admin/stats";

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
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const cards = [
    {
      label: t("dashboard.totalUsers"),
      value: stats.totalUsers.toLocaleString(localeFmt),
      icon: <Users className="h-5 w-5" />,
      hint: `${t("dashboard.onlineUsers")}: ${stats.onlineUsers}`,
    },
    {
      label: t("dashboard.verifiedUsers"),
      value: stats.verifiedUsers.toLocaleString(localeFmt),
      icon: <BadgeCheck className="h-5 w-5" />,
      hint: `${t("dashboard.pendingVerifications")}: ${stats.pendingVerifications}`,
    },
    {
      label: t("dashboard.listings"),
      value: stats.totalListings.toLocaleString(localeFmt),
      icon: <Store className="h-5 w-5" />,
      hint: `${t("dashboard.activeProducts")} / ${t("dashboard.activeServices")}`,
    },
    {
      label: t("dashboard.activeProducts"),
      value: stats.activeProducts.toLocaleString(localeFmt),
      icon: <Package className="h-5 w-5" />,
    },
    {
      label: t("dashboard.activeServices"),
      value: stats.activeServices.toLocaleString(localeFmt),
      icon: <Wrench className="h-5 w-5" />,
    },
    {
      label: t("dashboard.groups"),
      value: stats.totalGroups.toLocaleString(localeFmt),
      icon: <Users2 className="h-5 w-5" />,
      hint: `${t("dashboard.activeMembers")}: ${stats.activeMembers}`,
    },
    {
      label: t("dashboard.messages"),
      value: stats.totalMessages.toLocaleString(localeFmt),
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      label: t("dashboard.supportTickets"),
      value: stats.supportTickets.toLocaleString(localeFmt),
      icon: <Headphones className="h-5 w-5" />,
    },
    {
      label: t("dashboard.reportsWaiting"),
      value: stats.reportsWaiting.toLocaleString(localeFmt),
      icon: <Flag className="h-5 w-5" />,
    },
    {
      label: t("dashboard.pendingVerifications"),
      value: stats.pendingVerifications.toLocaleString(localeFmt),
      icon: <UserCheck className="h-5 w-5" />,
    },
    {
      label: t("dashboard.mappedListings"),
      value: stats.mappedListings.toLocaleString(localeFmt),
      icon: <MapPin className="h-5 w-5" />,
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
