import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Activity,
  Database,
  Users,
  ShieldAlert,
  Mail,
  DatabaseBackup,
  Headphones,
  UserCog,
  Gauge,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getSystemHealth, getPerformanceMetrics } from "@/server/admin/health";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.health")} · ${t("title")}` };
}

export default async function AdminHealthPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { forbidden } = await requireAdminPage(locale, "health.view");
  if (forbidden) return <AccessDenied />;

  const [health, perf] = await Promise.all([getSystemHealth(), getPerformanceMetrics()]);

  const cards = [
    { label: t("health.database"), value: health.database.ok ? t("health.ok") : t("health.down"), icon: <Database className="h-5 w-5" />, hint: health.database.fileSizeBytes ? `${Math.round(health.database.fileSizeBytes / 1024)} KB` : undefined },
    { label: t("health.totalUsers"), value: health.users.total.toLocaleString(localeFmt), icon: <Users className="h-5 w-5" />, hint: `${t("dashboard.pendingVerifications")}: ${health.users.pendingVerifications}` },
    { label: t("health.failedLogins24h"), value: health.security.failedLogins24h.toLocaleString(localeFmt), icon: <ShieldAlert className="h-5 w-5" /> },
    { label: t("health.queuedEmails"), value: health.email.queuedEmails.toLocaleString(localeFmt), icon: <Mail className="h-5 w-5" />, hint: `${t("health.failedEmails24h")}: ${health.email.failedEmails24h}` },
    { label: t("health.runningBackups"), value: health.backups.runningBackups.toLocaleString(localeFmt), icon: <DatabaseBackup className="h-5 w-5" />, hint: `${t("health.failedBackups")}: ${health.backups.failedBackups}` },
    { label: t("health.openTickets"), value: health.support.openTickets.toLocaleString(localeFmt), icon: <Headphones className="h-5 w-5" /> },
    { label: t("health.activeAdmins"), value: health.admins.activeAdminUsers.toLocaleString(localeFmt), icon: <UserCog className="h-5 w-5" /> },
    { label: t("health.apiCallsHour"), value: perf.api.callsLastHour.toLocaleString(localeFmt), icon: <Activity className="h-5 w-5" />, hint: `${t("health.avgLatency")}: ${perf.api.avgLatencyMs}ms` },
    { label: t("health.apiErrorsHour"), value: perf.api.errorsLastHour.toLocaleString(localeFmt), icon: <Gauge className="h-5 w-5" />, hint: `${t("health.errorRate")}: ${perf.api.errorRate.toFixed(1)}%` },
  ];

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("nav.health")}
        description={t("health.subtitle")}
        actions={
          <Badge variant={health.database.ok ? "success" : "danger"}>
            {health.database.ok ? t("health.ok") : t("health.down")}
          </Badge>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  );
}
