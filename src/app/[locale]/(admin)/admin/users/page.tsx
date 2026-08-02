import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eye, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import {
  AdminTable,
  TableCell,
} from "@/components/admin/admin-table";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminResetPasswordButton } from "@/components/admin/admin-reset-password-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/server/admin/page-guard";
import { searchUsers } from "@/server/admin/users";
import {
  setUserAccountStatusAction,
  adminApproveVerificationAction,
  deleteUserAccountAction,
} from "@/server/actions/admin-actions";
import { formatMoney } from "@/lib/money";

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tAct = await getTranslations("admin.actions");
  const sp = await searchParams;

  const { ctx, forbidden } = await requireAdminPage(locale, "users.view");
  if (forbidden) return <AccessDenied />;

  const page = Number(sp.page ?? "1") || 1;
  const data = await searchUsers({
    query: sp.query,
    accountStatus: sp.accountStatus || undefined,
    verificationStatus: sp.verificationStatus || undefined,
    page,
  });

  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.users")} />
      <AdminToolbar
        searchPlaceholder={t("common.search")}
        filters={[
          {
            param: "accountStatus",
            label: t("common.status"),
            allLabel: t("common.all"),
            options: [
              { value: "active", label: t("status.active") },
              { value: "suspended", label: t("status.suspended") },
              { value: "banned", label: t("status.banned") },
              { value: "deactivated", label: t("status.inactive") },
            ],
          },
          {
            param: "verificationStatus",
            label: t("nav.verification"),
            allLabel: t("common.all"),
            options: [
              { value: "pending", label: t("status.pending") },
              { value: "verified", label: t("status.verified") },
              { value: "rejected", label: t("status.rejected") },
            ],
          },
        ]}
      />

      {data.users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("common.noResults")}
          description={t("common.noResults")}
        />
      ) : (
        <>
          <AdminTable
            headers={[
              t("common.user"),
              t("common.status"),
              t("nav.verification"),
              t("nav.wallets"),
              t("common.date"),
              t("common.actions"),
            ]}
          >
            {data.users.map((user) => {
              const name =
                user.profile?.displayName ??
                user.profile?.username ??
                user.email;
              const canSuspend = ctx.permissions.has("users.suspend");
              const canBan = ctx.permissions.has("users.ban");
              const canRestore = ctx.permissions.has("users.restore");
              const canDelete = ctx.permissions.has("users.delete");
              const canReset = ctx.permissions.has("users.reset_password");
              const canVerify = ctx.permissions.has("users.verify");
              return (
                <tr key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-800/40 dark:text-brand-200">
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.accountStatus} />
                  </TableCell>
                  <TableCell>
                    {user.verification ? (
                      <StatusBadge status={user.verification.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMoney(user.wallet?.availableCents ?? 0, "EUR", localeFmt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.wallet?.walletId ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {user.createdAt.toLocaleDateString(localeFmt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={`/admin/users/${user.id}`}>
                        <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                          {t("common.view")}
                        </Button>
                      </Link>
                      {canReset ? (
                        <AdminResetPasswordButton userId={user.id} />
                      ) : null}
                      {canVerify && user.verification?.status === "pending" ? (
                        <AdminActionButton
                          action={adminApproveVerificationAction}
                          label={tAct("approve")}
                          fixedArgs={{ userId: user.id }}
                          variant="soft"
                        />
                      ) : null}
                      {canSuspend && user.accountStatus === "active" ? (
                        <AdminActionButton
                          action={setUserAccountStatusAction}
                          label={tAct("suspend")}
                          fixedArgs={{ userId: user.id, action: "suspend" }}
                          title={tAct("suspend")}
                          fields={[
                            {
                              name: "reason",
                              type: "textarea",
                              label: t("common.reason"),
                            },
                          ]}
                        />
                      ) : null}
                      {canBan && user.accountStatus !== "banned" ? (
                        <AdminActionButton
                          action={setUserAccountStatusAction}
                          label={tAct("ban")}
                          fixedArgs={{ userId: user.id, action: "ban" }}
                          title={tAct("ban")}
                          fields={[
                            {
                              name: "reason",
                              type: "textarea",
                              label: t("common.reason"),
                            },
                          ]}
                          danger
                        />
                      ) : null}
                      {canRestore &&
                      ["suspended", "banned", "deactivated"].includes(
                        user.accountStatus,
                      ) ? (
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
                    </div>
                  </TableCell>
                </tr>
              );
            })}
          </AdminTable>
          <AdminPagination
            page={data.page}
            totalPages={Math.ceil(data.total / data.pageSize)}
            total={data.total}
          />
        </>
      )}
    </div>
  );
}
