import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getReportDetail } from "@/server/admin/reports";
import { resolveReportAction } from "@/server/actions/admin-actions";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-end text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tAct = await getTranslations("admin.actions");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "reports.view");
  if (forbidden) return <AccessDenied />;

  const report = await getReportDetail(id);
  if (!report) notFound();

  const canResolve = ctx.permissions.has("reports.resolve");
  const isOpen = ["open", "reviewing"].includes(report.status);

  return (
    <div className="animate-in-up">
      <Link
        href="/admin/reports"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <PageHeader
        title={`${t("reports.report")} · ${report.id.slice(0, 8)}`}
        description={report.createdAt.toLocaleString(localeFmt)}
        actions={<StatusBadge status={report.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.details")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label={t("reports.reason")} value={report.reason} />
            <Row
              label={t("reports.targetType")}
              value={<StatusBadge status={report.targetType} />}
            />
            <Row
              label={t("reports.reporter")}
              value={
                report.reporter?.profile?.displayName ??
                report.reporter?.profile?.username ??
                report.reporter?.email ??
                "—"
              }
            />
            <Row label={t("reports.details")} value={report.details ?? "—"} />
            <Row label={t("reports.actionTaken")} value={report.actionTaken ?? "—"} />
          </CardContent>
        </Card>

        {report.post ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.content")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-foreground">{report.post.content}</p>
              <p className="text-xs text-muted-foreground">
                {t("reports.author")}:{" "}
                {report.post.author?.profile?.displayName ??
                  report.post.author?.profile?.username ??
                  report.post.author?.email ??
                  "—"}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {isOpen && canResolve ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AdminActionButton
            action={resolveReportAction}
            label={tAct("ignore")}
            fixedArgs={{ reportId: id, action: "ignore" }}
            title={tAct("ignore")}
            fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
            variant="soft"
          />
          <AdminActionButton
            action={resolveReportAction}
            label={tAct("removeContent")}
            fixedArgs={{ reportId: id, action: "remove_content" }}
            title={tAct("removeContent")}
            fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
            danger
          />
          <AdminActionButton
            action={resolveReportAction}
            label={tAct("warn")}
            fixedArgs={{ reportId: id, action: "warn" }}
            title={tAct("warn")}
            fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
          />
          <AdminActionButton
            action={resolveReportAction}
            label={tAct("suspend")}
            fixedArgs={{ reportId: id, action: "suspend_user" }}
            title={tAct("suspend")}
            fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
            danger
          />
          <AdminActionButton
            action={resolveReportAction}
            label={tAct("ban")}
            fixedArgs={{ reportId: id, action: "ban_user" }}
            title={tAct("ban")}
            fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
            danger
          />
        </div>
      ) : null}
    </div>
  );
}
