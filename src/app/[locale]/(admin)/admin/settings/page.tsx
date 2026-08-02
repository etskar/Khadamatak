import { getTranslations, setRequestLocale } from "next-intl/server";
import { Server, Shield, Mail, Users, Wrench } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AdminCard, AdminSectionTitle } from "@/components/admin/admin-card";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getSystemSettings } from "@/server/admin/settings";
import { updatePlatformSettingsFlatAction } from "@/server/actions/admin-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.settings")} · ${t("title")}` };
}

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const { forbidden } = await requireAdminPage(locale, "settings.view");
  if (forbidden) return <AccessDenied />;

  const { platform } = await getSystemSettings();

  const feePercent = platform ? platform.feePercentBps / 100 : null;

  const cards = [
    { label: t("settings.platform"), value: platform?.defaultLanguage ?? "—", icon: <Server className="h-5 w-5" /> },
    { label: t("settings.currency"), value: platform?.currency ?? "—", icon: <Wrench className="h-5 w-5" /> },
    { label: t("settings.feePercent"), value: feePercent !== null ? `${feePercent}%` : "—", icon: <Users className="h-5 w-5" /> },
    { label: t("settings.maintenance"), value: platform?.maintenanceMode ? t("status.active") : t("status.inactive"), icon: <Shield className="h-5 w-5" /> },
  ];

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.settings")} description={t("settings.subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <AdminCard>
          <AdminSectionTitle>{t("settings.general")}</AdminSectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            <AdminActionButton
              action={updatePlatformSettingsFlatAction}
              label={t("settings.editPlatform")}
              fields={[
                { name: "currency", label: t("settings.currency") },
                { name: "defaultLanguage", label: t("settings.defaultLanguage") },
                { name: "theme", label: t("settings.theme") },
                { name: "emailFromAddress", label: t("settings.supportEmail") },
              ]}
            />
            <AdminActionButton
              action={updatePlatformSettingsFlatAction}
              label={t("settings.transactionFees")}
              fields={[
                { name: "feePercentBps", type: "number", label: t("settings.feePercentBps") },
                { name: "feeFixedCents", type: "number", label: t("settings.feeFixedCents") },
                { name: "minFeeCents", type: "number", label: t("settings.minFeeCents") },
              ]}
            />
          </div>
        </AdminCard>

        <AdminCard>
          <AdminSectionTitle>{t("settings.safety")}</AdminSectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            <AdminActionButton
              action={updatePlatformSettingsFlatAction}
              label={t("settings.editPlatform")}
              fields={[{ name: "timezone", label: t("settings.timezone") }]}
            />
          </div>
        </AdminCard>

        <div className="flex items-start gap-2 rounded-xl border border-muted bg-card p-4 text-xs text-muted-foreground">
          <Mail className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("settings.flatHint")}</span>
        </div>
      </div>
    </div>
  );
}
