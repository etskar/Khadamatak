import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listEscrows } from "@/server/admin/escrow";
import { formatMoney } from "@/lib/money";

const ESCROW_STATUSES = [
  "created",
  "funded",
  "delivered",
  "frozen",
  "disputed",
  "completed",
  "refunded",
  "cancelled",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.escrow")} · ${t("title")}` };
}

export default async function AdminEscrowPage({
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

  const { forbidden } = await requireAdminPage(locale, "escrow.view");
  if (forbidden) return <AccessDenied />;

  const data = await listEscrows({
    status: sp.status,
    query: sp.query,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.escrow")} description={t("escrow.subtitle")} />

      <AdminToolbar
        searchPlaceholder={t("escrow.search")}
        filters={[
          {
            param: "status",
            label: t("common.status"),
            allLabel: t("common.all"),
            options: ESCROW_STATUSES.map((s) => ({
              value: s,
              label: t(`status.${s}`, { defaultValue: s }),
            })),
          },
        ]}
      />

      <AdminTable
        headers={[
          t("common.id"),
          t("escrow.buyer"),
          t("escrow.seller"),
          t("common.amount"),
          t("common.status"),
          t("orders.dispute"),
          t("common.date"),
        ]}
      >
        {data.items.map((escrow) => (
          <tr key={escrow.id}>
            <TableCell>
              <Link
                href={`/admin/escrow/${escrow.publicId}`}
                className="font-mono text-brand-700 hover:underline dark:text-brand-300"
              >
                {escrow.publicId}
              </Link>
            </TableCell>
            <TableCell>
              {escrow.buyer?.profile?.displayName ?? escrow.buyer?.profile?.username ?? "—"}
            </TableCell>
            <TableCell>
              {escrow.seller?.profile?.displayName ?? escrow.seller?.profile?.username ?? "—"}
            </TableCell>
            <TableCell>{formatMoney(escrow.amountCents, "EUR", localeFmt)}</TableCell>
            <TableCell>
              <StatusBadge status={escrow.status} />
            </TableCell>
            <TableCell>
              {escrow.dispute ? (
                <Link
                  href={`/admin/disputes/${escrow.dispute.publicId}`}
                  className="text-brand-700 hover:underline dark:text-brand-300"
                >
                  {escrow.dispute.publicId}
                </Link>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell>{escrow.createdAt.toLocaleDateString(localeFmt)}</TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
