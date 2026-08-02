import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listOrders } from "@/server/admin/orders";
import { formatMoney } from "@/lib/money";

const ORDER_STATUSES = [
  "pending_payment",
  "payment_secured",
  "processing",
  "delivered",
  "completed",
  "cancelled",
  "disputed",
  "refunded",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.orders")} · ${t("title")}` };
}

export default async function AdminOrdersPage({
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

  const { forbidden } = await requireAdminPage(locale, "orders.view");
  if (forbidden) return <AccessDenied />;

  const data = await listOrders({
    status: sp.status,
    query: sp.query,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.orders")} description={t("orders.subtitle")} />

      <AdminToolbar
        searchPlaceholder={t("orders.search")}
        filters={[
          {
            param: "status",
            label: t("common.status"),
            allLabel: t("common.all"),
            options: ORDER_STATUSES.map((s) => ({
              value: s,
              label: t(`status.${s}`, { defaultValue: s }),
            })),
          },
        ]}
      />

      <AdminTable
        headers={[
          t("common.id"),
          t("orders.buyer"),
          t("orders.seller"),
          t("common.amount"),
          t("common.status"),
          t("orders.delivery"),
          t("common.date"),
        ]}
      >
        {data.items.map((order) => (
          <tr key={order.id}>
            <TableCell>
              <Link
                href={`/admin/orders/${order.publicId}`}
                className="font-mono text-brand-700 hover:underline dark:text-brand-300"
              >
                {order.publicId}
              </Link>
            </TableCell>
            <TableCell>
              {order.buyer?.profile?.displayName ?? order.buyer?.profile?.username ?? "—"}
            </TableCell>
            <TableCell>
              {order.seller?.profile?.displayName ?? order.seller?.profile?.username ?? "—"}
            </TableCell>
            <TableCell>{formatMoney(order.amountCents, "EUR", localeFmt)}</TableCell>
            <TableCell>
              <StatusBadge status={order.status} />
            </TableCell>
            <TableCell>
              <StatusBadge status={order.deliveryStatus} />
            </TableCell>
            <TableCell>{order.createdAt.toLocaleDateString(localeFmt)}</TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
