import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listWallets } from "@/server/admin/wallets";
import { formatMoney } from "@/lib/money";

const WALLET_STATUSES = ["active", "locked", "suspended", "closed"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.wallets")} · ${t("title")}` };
}

export default async function AdminWalletsPage({
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

  const { forbidden } = await requireAdminPage(locale, "wallets.view");
  if (forbidden) return <AccessDenied />;

  const data = await listWallets({
    status: sp.status,
    query: sp.query,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.wallets")} description={t("wallets.subtitle")} />

      <AdminToolbar
        searchPlaceholder={t("wallets.search")}
        filters={[
          {
            param: "status",
            label: t("common.status"),
            allLabel: t("common.all"),
            options: WALLET_STATUSES.map((s) => ({
              value: s,
              label: t(`status.${s}`, { defaultValue: s }),
            })),
          },
        ]}
      />

      <AdminTable
        headers={[
          t("wallets.walletId"),
          t("wallets.username"),
          t("common.user"),
          t("status.available"),
          t("status.pending"),
          t("status.frozen"),
          t("common.status"),
        ]}
      >
        {data.items.map((wallet) => (
          <tr key={wallet.id}>
            <TableCell>
              <Link
                href={`/admin/wallets/${wallet.userId}`}
                className="font-mono text-brand-700 hover:underline dark:text-brand-300"
              >
                {wallet.walletId}
              </Link>
            </TableCell>
            <TableCell>{wallet.walletUsername}</TableCell>
            <TableCell>
              {wallet.user?.profile?.displayName ?? wallet.user?.profile?.username ?? wallet.user?.email ?? "—"}
            </TableCell>
            <TableCell>{formatMoney(wallet.availableCents, "EUR", localeFmt)}</TableCell>
            <TableCell>{formatMoney(wallet.pendingCents, "EUR", localeFmt)}</TableCell>
            <TableCell>{formatMoney(wallet.frozenCents, "EUR", localeFmt)}</TableCell>
            <TableCell>
              <StatusBadge status={wallet.status} />
            </TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
