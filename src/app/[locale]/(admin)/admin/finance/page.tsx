import { getTranslations, setRequestLocale } from "next-intl/server";
import { Banknote, Lock, Percent, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getDashboardStats } from "@/server/admin/stats";
import { listPayments } from "@/server/admin/payments";
import { formatMoney } from "@/lib/money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.finance")} · ${t("title")}` };
}

export default async function AdminFinancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { forbidden } = await requireAdminPage(locale, "finance.view");
  if (forbidden) return <AccessDenied />;

  const stats = await getDashboardStats();
  const payments = await listPayments({ page: 1 });

  const cards = [
    { label: t("dashboard.revenueToday"), value: formatMoney(stats.revenueTodayCents, "EUR", localeFmt), icon: <TrendingUp className="h-5 w-5" /> },
    { label: t("dashboard.revenueMonth"), value: formatMoney(stats.revenueMonthCents, "EUR", localeFmt), icon: <Banknote className="h-5 w-5" /> },
    { label: t("dashboard.commission"), value: formatMoney(stats.commissionCents, "EUR", localeFmt), icon: <Percent className="h-5 w-5" /> },
    { label: t("dashboard.escrowBalance"), value: formatMoney(stats.escrowBalanceCents, "EUR", localeFmt), icon: <Lock className="h-5 w-5" /> },
  ];

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.finance")} description={t("finance.subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-foreground">{t("finance.recent")}</h3>
      <AdminTable headers={[t("common.id"), t("payments.type"), t("common.status"), t("common.amount"), t("wallets.method"), t("common.date")]}>
        {payments.items.slice(0, 20).map((tx) => (
          <tr key={tx.id}>
            <TableCell className="font-mono">{tx.reference ?? tx.id}</TableCell>
            <TableCell><StatusBadge status={tx.type} /></TableCell>
            <TableCell><StatusBadge status={tx.status} /></TableCell>
            <TableCell>{formatMoney(tx.amountCents, "EUR", localeFmt)}</TableCell>
            <TableCell>{tx.paymentMethod ?? "—"}</TableCell>
            <TableCell>{tx.createdAt.toLocaleDateString(localeFmt)}</TableCell>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
