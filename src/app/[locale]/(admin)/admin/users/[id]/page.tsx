import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowLeft,
  FileWarning,
  ScrollText,
  ShieldAlert,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminResetPasswordButton } from "@/components/admin/admin-reset-password-button";
import { AdminExportButton } from "@/components/admin/admin-export-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getUserDetail } from "@/server/admin/users";
import {
  setUserAccountStatusAction,
  adminApproveVerificationAction,
  adminRejectVerificationAction,
  editUserAccountFlatAction,
  deleteUserAccountAction,
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

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tAct = await getTranslations("admin.actions");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "users.view");
  if (forbidden) return <AccessDenied />;

  const user = await getUserDetail(id);
  if (!user) notFound();

  const name = user.profile?.displayName ?? user.profile?.username ?? user.email;
  const canVerify = ctx.permissions.has("users.verify");
  const canSuspend = ctx.permissions.has("users.suspend");
  const canBan = ctx.permissions.has("users.ban");
  const canRestore = ctx.permissions.has("users.restore");
  const canDelete = ctx.permissions.has("users.delete");
  const canEdit = ctx.permissions.has("users.edit");
  const canReset = ctx.permissions.has("users.reset_password");
  const canExportWallet = ctx.permissions.has("wallets.export");

  return (
    <div className="animate-in-up">
      <Link
        href="/admin/users"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <PageHeader
        title={name}
        actions={
          user.verification?.status === "pending" && canVerify ? (
            <>
              <AdminActionButton
                action={adminApproveVerificationAction}
                label={tAct("approve")}
                fixedArgs={{ userId: user.id }}
                variant="soft"
              />
              <AdminActionButton
                action={adminRejectVerificationAction}
                label={tAct("reject")}
                fixedArgs={{ userId: user.id }}
                title={tAct("reject")}
                fields={[
                  { name: "reason", type: "textarea", label: t("common.reason") },
                ]}
                danger
              />
            </>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("nav.users")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label={t("common.user")} value={user.email} />
            <Row label={t("common.status")} value={<StatusBadge status={user.accountStatus} />} />
            <Row label={t("common.date")} value={user.createdAt.toLocaleDateString(localeFmt)} />
            <Row label={t("status.lastActive")} value={user.lastActiveAt ? user.lastActiveAt.toLocaleDateString(localeFmt) : "—"} />
            <Row label={t("status.phone")} value={user.phone ?? "—"} />
            <Row label={t("status.locale")} value={user.locale} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("nav.wallets")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label={t("nav.wallets")} value={user.wallet?.walletId ?? "—"} />
            <Row
              label={t("status.available")}
              value={formatMoney(user.wallet?.availableCents ?? 0, "EUR", localeFmt)}
            />
            <Row
              label={t("status.pending")}
              value={formatMoney(user.wallet?.pendingCents ?? 0, "EUR", localeFmt)}
            />
            <Row
              label={t("status.frozen")}
              value={formatMoney(user.wallet?.frozenCents ?? 0, "EUR", localeFmt)}
            />
            <Row
              label={t("common.status")}
              value={
                user.wallet ? (
                  <StatusBadge status={user.wallet.status} />
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("nav.verification")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row
              label={t("common.status")}
              value={
                user.verification ? (
                  <StatusBadge status={user.verification.status} />
                ) : (
                  "—"
                )
              }
            />
            <Row
              label={t("status.submittedAt")}
              value={
                user.verification?.submittedAt
                  ? user.verification.submittedAt.toLocaleDateString(localeFmt)
                  : "—"
              }
            />
            <Row label={t("status.fullName")} value={user.verification?.fullName ?? "—"} />
            <Row label={t("common.user")} value={user.verification?.country ?? "—"} />
            {user.verification?.rejectionReason ? (
              <Row label={t("status.rejectionReason")} value={user.verification.rejectionReason} />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("status.ordersAsBuyer")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{user._count.ordersAsBuyer}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("status.ordersAsSeller")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{user._count.ordersAsSeller}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("status.postsCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{user._count.posts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("status.reportsCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{user._count.reports}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canReset ? <AdminResetPasswordButton userId={user.id} /> : null}
        {canEdit ? (
          <AdminActionButton
            action={editUserAccountFlatAction}
            label={t("common.edit")}
            fixedArgs={{ userId: user.id }}
            title={t("common.edit")}
            fields={[
              { name: "realName", label: t("status.realName") },
              { name: "phone", label: t("status.phone") },
              {
                name: "locale",
                label: t("status.locale"),
                type: "select",
                options: [
                  { value: "ar", label: "العربية" },
                  { value: "nl", label: "Nederlands" },
                ],
              },
            ]}
          />
        ) : null}
        {canSuspend && user.accountStatus === "active" ? (
          <AdminActionButton
            action={setUserAccountStatusAction}
            label={tAct("suspend")}
            fixedArgs={{ userId: user.id, action: "suspend" }}
            title={tAct("suspend")}
            fields={[{ name: "reason", type: "textarea", label: t("common.reason") }]}
          />
        ) : null}
        {canBan && user.accountStatus !== "banned" ? (
          <AdminActionButton
            action={setUserAccountStatusAction}
            label={tAct("ban")}
            fixedArgs={{ userId: user.id, action: "ban" }}
            title={tAct("ban")}
            fields={[{ name: "reason", type: "textarea", label: t("common.reason") }]}
            danger
          />
        ) : null}
        {canRestore && ["suspended", "banned", "deactivated"].includes(user.accountStatus) ? (
          <AdminActionButton
            action={setUserAccountStatusAction}
            label={tAct("restore")}
            fixedArgs={{ userId: user.id, action: "restore" }}
            variant="soft"
          />
        ) : null}
        {canDelete ? (
          <AdminActionButton
            action={deleteUserAccountAction}
            label={tAct("delete")}
            fixedArgs={{ userId: user.id }}
            title={tAct("delete")}
            danger
          />
        ) : null}
        {canExportWallet && user.wallet ? (
          <AdminExportButton
            action={async () => exportWalletCsvAction({ userId: user.id })}
            filename={`wallet-${user.wallet.walletId}.csv`}
            label={tAct("exportData")}
          />
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <ScrollText className="h-4 w-4" />
            {t("nav.audit")}
          </h3>
          <div className="space-y-2">
            {user.auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              user.auditLogs.map((log) => (
                <Card key={log.id} className="p-3">
                  <p className="text-sm font-medium text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.createdAt.toLocaleString(localeFmt)}
                  </p>
                </Card>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldAlert className="h-4 w-4" />
            {t("nav.security")}
          </h3>
          <div className="space-y-2">
            {user.securityEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              user.securityEvents.map((event) => (
                <Card key={event.id} className="p-3">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.createdAt.toLocaleString(localeFmt)}
                  </p>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {user.reports.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileWarning className="h-4 w-4" />
            {t("nav.reports")}
          </h3>
          <AdminTable headers={[t("common.date"), t("common.reason"), t("common.status")]}>
            {user.reports.map((report) => (
              <tr key={report.id}>
                <TableCell>{report.createdAt.toLocaleDateString(localeFmt)}</TableCell>
                <TableCell>{report.reason}</TableCell>
                <TableCell>
                  <StatusBadge status={report.status} />
                </TableCell>
              </tr>
            ))}
          </AdminTable>
        </div>
      ) : null}
    </div>
  );
}
