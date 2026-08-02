import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listAuditLogs } from "@/server/admin/audit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.audit")} · ${t("title")}` };
}

export default async function AdminAuditPage({
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

  const { forbidden } = await requireAdminPage(locale, "audit.view");
  if (forbidden) return <AccessDenied />;

  const data = await listAuditLogs({
    entityType: sp.entityType,
    action: sp.action,
    query: sp.query,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.audit")} description={t("audit.subtitle")} />

      <AdminToolbar searchPlaceholder={t("audit.search")} />

      <AdminTable headers={[t("common.date"), t("audit.action"), t("audit.entity"), t("audit.actor"), t("common.id")]}>
        {data.items.map((log) => (
          <tr key={log.id}>
            <TableCell>{log.createdAt.toLocaleString(localeFmt)}</TableCell>
            <TableCell><StatusBadge status={log.action} /></TableCell>
            <TableCell>{log.entityType ?? "—"}</TableCell>
            <TableCell>{log.adminActor?.name ?? log.actor?.email ?? "—"}</TableCell>
            <TableCell className="font-mono">{log.entityId ? log.entityId.slice(0, 12) : "—"}</TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
