import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listBackups } from "@/server/admin/backups";
import { requestBackupNowAction, deleteBackupAction } from "@/server/actions/admin-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.backups")} · ${t("title")}` };
}

export default async function AdminBackupsPage({
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
  const tAct = await getTranslations("admin.actions");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "backups.manage");
  if (forbidden) return <AccessDenied />;

  const canManage = ctx.permissions.has("backups.manage");

  const data = await listBackups({ page: sp.page ? Number(sp.page) : 1 });
  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("nav.backups")}
        description={t("backups.subtitle")}
        actions={
          canManage ? (
            <AdminActionButton action={requestBackupNowAction} label={t("backups.runNow")} title={t("backups.runNow")} />
          ) : null
        }
      />

      <AdminTable headers={[t("common.id"), t("backups.type"), t("backups.size"), t("common.status"), t("backups.startedAt"), t("backups.completedAt"), t("backups.actions")]}>
        {data.items.map((backup) => (
          <tr key={backup.id}>
            <TableCell className="font-mono">{backup.publicId}</TableCell>
            <TableCell>{backup.type}</TableCell>
            <TableCell>{backup.sizeBytes ? `${Math.round(backup.sizeBytes / 1024)} KB` : "—"}</TableCell>
            <TableCell><StatusBadge status={backup.status} /></TableCell>
            <TableCell>{backup.startedAt ? backup.startedAt.toLocaleString(localeFmt) : "—"}</TableCell>
            <TableCell>{backup.completedAt ? backup.completedAt.toLocaleString(localeFmt) : "—"}</TableCell>
            <TableCell>
              {canManage && backup.status !== "running" ? (
                <AdminActionButton action={deleteBackupAction} label={tAct("delete")} fixedArgs={{ id: backup.id }} title={tAct("delete")} danger />
              ) : null}
            </TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
