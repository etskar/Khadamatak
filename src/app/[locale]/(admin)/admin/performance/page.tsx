import { getTranslations, setRequestLocale } from "next-intl/server";
import { Activity, Mail, Gauge, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getPerformanceMetrics } from "@/server/admin/health";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.performance")} · ${t("title")}` };
}

export default async function AdminPerformancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { forbidden } = await requireAdminPage(locale, "performance.view");
  if (forbidden) return <AccessDenied />;

  const perf = await getPerformanceMetrics();

  const cards = [
    { label: t("performance.apiCalls"), value: perf.api.callsLastHour.toLocaleString(localeFmt), icon: <Activity className="h-5 w-5" />, hint: t("performance.lastHour") },
    { label: t("performance.avgLatency"), value: `${perf.api.avgLatencyMs} ms`, icon: <Gauge className="h-5 w-5" />, hint: t("performance.lastHour") },
    { label: t("performance.apiErrors"), value: perf.api.errorsLastHour.toLocaleString(localeFmt), icon: <Activity className="h-5 w-5" />, hint: `${t("performance.errorRate")}: ${perf.api.errorRate.toFixed(2)}%` },
    { label: t("performance.failedEmails"), value: perf.email.failedLastHour.toLocaleString(localeFmt), icon: <Mail className="h-5 w-5" />, hint: t("performance.lastHour") },
    { label: t("performance.auditToday"), value: perf.activity.auditEntriesToday.toLocaleString(localeFmt), icon: <ScrollText className="h-5 w-5" />, hint: t("performance.today") },
  ];

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.performance")} description={t("performance.subtitle")} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  );
}
