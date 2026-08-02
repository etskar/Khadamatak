import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listReports } from "@/server/admin/reports";

const REPORT_STATUSES = ["open", "reviewing", "resolved", "dismissed"];
const TARGET_TYPES = ["post", "comment", "user", "message", "product", "service", "group"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.reports")} · ${t("title")}` };
}

export default async function AdminReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { forbidden } = await requireAdminPage(locale, "reports.view");
  if (forbidden) return <AccessDenied />;

  const data = await listReports({
    status: sp.status,
    targetType: sp.targetType,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.reports")} description={t("reports.subtitle")} />

      <AdminToolbar
        searchPlaceholder={t("reports.search")}
        filters={[
          {
            param: "status",
            label: t("common.status"),
            allLabel: t("common.all"),
            options: REPORT_STATUSES.map((s) => ({
              value: s,
              label: t(`status.${s}`, { defaultValue: s }),
            })),
          },
          {
            param: "targetType",
            label: t("reports.targetType"),
            allLabel: t("common.all"),
            options: TARGET_TYPES.map((s) => ({
              value: s,
              label: t(`reports.type.${s}`, { defaultValue: s }),
            })),
          },
        ]}
      />

      <AdminTable
        headers={[
          t("common.id"),
          t("reports.reason"),
          t("reports.targetType"),
          t("reports.reporter"),
          t("common.status"),
          t("common.date"),
        ]}
      >
        {data.items.map((report) => (
          <tr key={report.id}>
            <TableCell>
              <Link
                href={`/admin/reports/${report.id}`}
                className="font-mono text-brand-700 hover:underline dark:text-brand-300"
              >
                {report.id.slice(0, 8)}
              </Link>
            </TableCell>
            <TableCell className="max-w-64 truncate">{report.reason}</TableCell>
            <TableCell>
              <StatusBadge status={report.targetType} />
            </TableCell>
            <TableCell>
              {report.reporter?.profile?.displayName ?? report.reporter?.profile?.username ?? report.reporter?.email ?? "—"}
            </TableCell>
            <TableCell>
              <StatusBadge status={report.status} />
            </TableCell>
            <TableCell>{report.createdAt.toLocaleDateString(localeFmt)}</TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
