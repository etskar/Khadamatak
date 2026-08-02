import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { searchUsers } from "@/server/admin/users";
import {
  adminApproveVerificationAction,
  adminRejectVerificationAction,
} from "@/server/actions/admin-actions";

const VERIFICATION_STATUSES = ["not_started", "pending", "verified", "rejected"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.verification")} · ${t("title")}` };
}

export default async function AdminVerificationPage({
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

  const { ctx, forbidden } = await requireAdminPage(locale, "verification.view");
  if (forbidden) return <AccessDenied />;

  const canVerify = ctx.permissions.has("verification.approve");

  const data = await searchUsers({
    query: sp.query,
    verificationStatus: sp.status || "pending",
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.verification")} description={t("verification.subtitle")} />

      <AdminToolbar
        searchPlaceholder={t("common.search")}
        filters={[
          {
            param: "status",
            label: t("common.status"),
            allLabel: t("verification.pending"),
            options: VERIFICATION_STATUSES.map((s) => ({
              value: s,
              label: t(`status.${s}`, { defaultValue: s }),
            })),
          },
        ]}
      />

      <AdminTable
        headers={[
          t("common.user"),
          t("common.date"),
          t("verification.submittedAt"),
          t("verification.status"),
          t("verification.actions"),
        ]}
      >
        {data.users.map((user) => {
          const name =
            user.profile?.displayName ?? user.profile?.username ?? user.email;
          return (
            <tr key={user.id}>
              <TableCell>
                <Link
                  href={`/admin/users/${user.id}`}
                  className="font-medium text-brand-700 hover:underline dark:text-brand-300"
                >
                  {name}
                </Link>
              </TableCell>
              <TableCell>{user.createdAt.toLocaleDateString(localeFmt)}</TableCell>
              <TableCell>
                {user.verification?.submittedAt
                  ? user.verification.submittedAt.toLocaleDateString(localeFmt)
                  : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={user.verification?.status ?? "not_started"} />
              </TableCell>
              <TableCell>
                {canVerify && user.verification?.status === "pending" ? (
                  <div className="flex flex-wrap gap-1.5">
                    <AdminActionButton
                      action={adminApproveVerificationAction}
                      label={tAct("approve")}
                      fixedArgs={{ userId: user.id }}
                      confirm={false}
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
                  </div>
                ) : null}
              </TableCell>
            </tr>
          );
        })}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
