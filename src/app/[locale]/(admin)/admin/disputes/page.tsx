import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listDisputes } from "@/server/admin/disputes";
import { formatMoney } from "@/lib/money";

const DISPUTE_STATUSES = ["open", "under_review", "resolved_refund", "resolved_release", "closed"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.disputes")} · ${t("title")}` };
}

export default async function AdminDisputesPage({
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

  const { forbidden } = await requireAdminPage(locale, "disputes.view");
  if (forbidden) return <AccessDenied />;

  const data = await listDisputes({
    status: sp.status,
    query: sp.query,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.disputes")} description={t("disputes.subtitle")} />

      <AdminToolbar
        searchPlaceholder={t("disputes.search")}
        filters={[
          {
            param: "status",
            label: t("common.status"),
            allLabel: t("common.all"),
            options: DISPUTE_STATUSES.map((s) => ({
              value: s,
              label: t(`status.${s}`, { defaultValue: s }),
            })),
          },
        ]}
      />

      <AdminTable
        headers={[
          t("common.id"),
          t("disputes.reason"),
          t("escrow.buyer"),
          t("escrow.seller"),
          t("common.amount"),
          t("common.status"),
          t("common.date"),
        ]}
      >
        {data.items.map((dispute) => (
          <tr key={dispute.id}>
            <TableCell>
              <Link
                href={`/admin/disputes/${dispute.publicId}`}
                className="font-mono text-brand-700 hover:underline dark:text-brand-300"
              >
                {dispute.publicId}
              </Link>
            </TableCell>
            <TableCell className="max-w-64 truncate">{dispute.reason}</TableCell>
            <TableCell>
              {dispute.escrow?.buyer?.profile?.displayName ??
                dispute.escrow?.buyer?.profile?.username ??
                "—"}
            </TableCell>
            <TableCell>
              {dispute.escrow?.seller?.profile?.displayName ??
                dispute.escrow?.seller?.profile?.username ??
                "—"}
            </TableCell>
            <TableCell>
              {dispute.escrow
                ? formatMoney(dispute.escrow.amountCents, "EUR", localeFmt)
                : "—"}
            </TableCell>
            <TableCell>
              <StatusBadge status={dispute.status} />
            </TableCell>
            <TableCell>{dispute.createdAt.toLocaleDateString(localeFmt)}</TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
