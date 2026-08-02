import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listPayments, listPaymentRequests } from "@/server/admin/payments";
import { formatMoney } from "@/lib/money";

const TX_TYPES = ["deposit", "transfer", "payment_request", "escrow_lock", "escrow_release", "escrow_refund", "fee", "adjustment"];
const TX_STATUSES = ["pending", "processing", "completed", "failed", "cancelled", "reversed"];
const METHODS = ["ideal", "wallet", "card", "sepa", "paypal", "apple_pay", "google_pay", "bancontact"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.payments")} · ${t("title")}` };
}

export default async function AdminPaymentsPage({
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

  const { forbidden } = await requireAdminPage(locale, "payments.view");
  if (forbidden) return <AccessDenied />;

  const view = sp.view === "requests" ? "requests" : "transactions";

  const txData = await listPayments({
    type: sp.type,
    status: sp.status,
    paymentMethod: sp.method,
    query: sp.query,
    page: sp.page ? Number(sp.page) : 1,
  });
  const requestData = await listPaymentRequests({
    status: sp.status,
    page: sp.page ? Number(sp.page) : 1,
  });

  const data = view === "transactions" ? txData : requestData;
  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.payments")} description={t("payments.subtitle")} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["transactions", "requests"].map((v) => (
          <Badge key={v} variant={view === v ? "default" : "secondary"} className="cursor-pointer text-sm">
            <a href={v === "transactions" ? "/admin/payments" : "/admin/payments?view=requests"}>
              {t(`payments.tab.${v}`)}
            </a>
          </Badge>
        ))}
      </div>

      {view === "transactions" ? (
        <AdminToolbar
          searchPlaceholder={t("payments.search")}
          filters={[
            { param: "type", label: t("payments.type"), allLabel: t("common.all"), options: TX_TYPES.map((s) => ({ value: s, label: t(`status.${s}`, { defaultValue: s }) })) },
            { param: "status", label: t("common.status"), allLabel: t("common.all"), options: TX_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`, { defaultValue: s }) })) },
            { param: "method", label: t("wallets.method"), allLabel: t("common.all"), options: METHODS.map((s) => ({ value: s, label: s })) },
          ]}
        />
      ) : null}

      {view === "transactions" ? (
        <AdminTable
          headers={[t("common.id"), t("payments.type"), t("common.status"), t("common.amount"), t("payments.from"), t("payments.to"), t("wallets.method"), t("common.date")]}
        >
          {txData.items.map((tx) => (
            <tr key={tx.id}>
              <TableCell className="font-mono">{tx.reference ?? tx.id}</TableCell>
              <TableCell><StatusBadge status={tx.type} /></TableCell>
              <TableCell><StatusBadge status={tx.status} /></TableCell>
              <TableCell>{formatMoney(tx.amountCents, "EUR", localeFmt)}</TableCell>
              <TableCell>{tx.fromWallet?.user?.profile?.displayName ?? tx.fromWallet?.user?.profile?.username ?? "—"}</TableCell>
              <TableCell>{tx.toWallet?.user?.profile?.displayName ?? tx.toWallet?.user?.profile?.username ?? "—"}</TableCell>
              <TableCell>{tx.paymentMethod ?? "—"}</TableCell>
              <TableCell>{tx.createdAt.toLocaleDateString(localeFmt)}</TableCell>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <AdminTable headers={[t("common.id"), t("payments.from"), t("payments.to"), t("common.amount"), t("payments.description"), t("common.status"), t("common.date")]}>
          {requestData.items.map((req) => (
            <tr key={req.id}>
              <TableCell className="font-mono">{req.publicId}</TableCell>
              <TableCell>{req.fromUser?.profile?.displayName ?? req.fromUser?.profile?.username ?? "—"}</TableCell>
              <TableCell>{req.toUser?.profile?.displayName ?? req.toUser?.profile?.username ?? "—"}</TableCell>
              <TableCell>{formatMoney(req.amountCents, "EUR", localeFmt)}</TableCell>
              <TableCell className="max-w-56 truncate">{req.description}</TableCell>
              <TableCell><StatusBadge status={req.status} /></TableCell>
              <TableCell>{req.createdAt.toLocaleDateString(localeFmt)}</TableCell>
            </tr>
          ))}
        </AdminTable>
      )}

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
