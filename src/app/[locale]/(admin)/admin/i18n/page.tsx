import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { Badge } from "@/components/ui/badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getTranslationOverview } from "@/server/admin/i18n";
import { translateMissingKeysAction } from "@/server/actions/admin-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.i18n")} · ${t("title")}` };
}

export default async function AdminI18nPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "i18n.manage");
  if (forbidden) return <AccessDenied />;

  const canManage = ctx.permissions.has("i18n.manage");
  const overview = await getTranslationOverview();

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("nav.i18n")}
        description={t("i18n.subtitle")}
        actions={
          canManage ? (
            <AdminActionButton
              action={translateMissingKeysAction}
              label={t("i18n.translate")}
              title={t("i18n.translate")}
            />
          ) : null
        }
      />

      <AdminTable headers={[t("i18n.locale"), t("i18n.total"), t("i18n.complete"), t("i18n.missing"), t("i18n.coverage")]}>
        {overview.locales.map((row) => {
          const pct = row.total ? Math.round((row.complete / row.total) * 100) : 100;
          return (
            <tr key={row.locale}>
              <TableCell className="font-medium text-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="uppercase">{row.locale}</span>
                </span>
              </TableCell>
              <TableCell>{row.total.toLocaleString(localeFmt)}</TableCell>
              <TableCell>{row.complete.toLocaleString(localeFmt)}</TableCell>
              <TableCell>
                <Badge variant={row.missing > 0 ? "warning" : "success"}>
                  {row.missing.toLocaleString(localeFmt)}
                </Badge>
              </TableCell>
              <TableCell className="min-w-40">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{pct}%</span>
                </div>
              </TableCell>
            </tr>
          );
        })}
      </AdminTable>

      {overview.samples.length > 0 ? (
        <div className="mt-8">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4" />
            {t("i18n.sampleMissing")}
          </h3>
          <div className="rounded-xl border border-muted bg-card p-4 font-mono text-xs leading-7 text-muted-foreground">
            {overview.samples.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-destructive">•</span> {key}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
