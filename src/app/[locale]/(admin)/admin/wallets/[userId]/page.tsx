import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminExportButton } from "@/components/admin/admin-export-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getWalletDetail } from "@/server/admin/wallets";
import {
  setWalletStatusAction,
  exportWalletCsvAction,
} from "@/server/actions/admin-actions";
import { formatMoney } from "@/lib/money";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-end text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default async function AdminWalletDetailPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale, userId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tAct = await getTranslations("admin.actions");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "wallets.view");
  if (forbidden) return <AccessDenied />;

  const data = await getWalletDetail(userId);
  if (!data) notFound();
  const { wallet, transactions, ledger } = data;

  const canFreeze = ctx.permissions.has("wallets.freeze");
  const canExport = ctx.permissions.has("wallets.export");
  const name =
    wallet.user?.profile?.displayName ?? wallet.user?.profile?.username ?? wallet.user?.email;

  return (
    <div className="animate-in-up">
      <Link
        href="/admin/wallets"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <PageHeader
        title={<span className="font-mono">{wallet.walletId}</span>}
        description={`${t("nav.wallets")} · ${name}`}
        actions={<StatusBadge status={wallet.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.details")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label={t("common.user")} value={name} />
            <Row label={t("wallets.username")} value={wallet.walletUsername} />
            <Row label={t("wallets.currency")} value={wallet.currency} />
            <Row label={t("common.status")} value={<StatusBadge status={wallet.status} />} />
            <Row label={t("status.locale")} value={wallet.user?.locale ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("wallets.balance")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label={t("status.available")} value={formatMoney(wallet.availableCents, "EUR", localeFmt)} />
            <Row label={t("status.pending")} value={formatMoney(wallet.pendingCents, "EUR", localeFmt)} />
            <Row label={t("status.frozen")} value={formatMoney(wallet.frozenCents, "EUR", localeFmt)} />
            <Row
              label={t("status.total")}
              value={formatMoney(
                wallet.availableCents + wallet.pendingCents + wallet.frozenCents,
                "EUR",
                localeFmt,
              )}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canFreeze ? (
          wallet.status === "active" ? (
            <AdminActionButton
              action={setWalletStatusAction}
              label={tAct("freeze")}
              fixedArgs={{ userId, action: "freeze" }}
              title={tAct("freeze")}
              fields={[{ name: "reason", type: "textarea", label: t("common.reason") }]}
              danger
            />
          ) : (
            <AdminActionButton
              action={setWalletStatusAction}
              label={tAct("unfreeze")}
              fixedArgs={{ userId, action: "unfreeze" }}
              confirm={false}
              variant="soft"
            />
          )
        ) : null}
        {canExport ? (
          <AdminExportButton
            action={async () => exportWalletCsvAction({ userId })}
            filename={`wallet-${wallet.walletId}.csv`}
            label={tAct("exportData")}
          />
        ) : null}
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          {t("wallets.transactions")} ({transactions.length})
        </h3>
        <AdminTable
          headers={[t("common.id"), t("wallets.type"), t("common.status"), t("common.amount"), t("wallets.method"), t("common.date")]}
        >
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <TableCell className="font-mono">
                {(tx as unknown as { reference?: string }).reference ?? tx.id}
              </TableCell>
              <TableCell>
                <StatusBadge status={tx.type} />
              </TableCell>
              <TableCell>
                <StatusBadge status={tx.status} />
              </TableCell>
              <TableCell>{formatMoney(tx.amountCents, "EUR", localeFmt)}</TableCell>
              <TableCell>{tx.paymentMethod ?? "—"}</TableCell>
              <TableCell>{tx.createdAt.toLocaleDateString(localeFmt)}</TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          {t("wallets.ledger")} ({ledger.length})
        </h3>
        <AdminTable
          headers={[t("wallets.direction"), t("wallets.bucket"), t("common.amount"), t("wallets.balanceAfter"), t("common.description"), t("common.date")]}
        >
          {ledger.map((entry) => (
            <tr key={entry.id}>
              <TableCell>
                <StatusBadge status={entry.direction} />
              </TableCell>
              <TableCell>{entry.accountBucket}</TableCell>
              <TableCell>{formatMoney(entry.amountCents, "EUR", localeFmt)}</TableCell>
              <TableCell>{formatMoney(entry.balanceAfterCents, "EUR", localeFmt)}</TableCell>
              <TableCell>{entry.description ?? "—"}</TableCell>
              <TableCell>{entry.createdAt.toLocaleDateString(localeFmt)}</TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
    </div>
  );
}
