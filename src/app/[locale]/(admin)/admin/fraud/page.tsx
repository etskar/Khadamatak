import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listRiskScores } from "@/server/admin/security";
import { setUserRiskScoreAction } from "@/server/actions/admin-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.fraud")} · ${t("title")}` };
}

export default async function AdminFraudPage({
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

  const { ctx, forbidden } = await requireAdminPage(locale, "fraud.view");
  if (forbidden) return <AccessDenied />;

  const canManage = ctx.permissions.has("fraud.manage");

  const data = await listRiskScores({
    minScore: sp.minScore ? Number(sp.minScore) : undefined,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.fraud")} description={t("fraud.subtitle")} />

      <AdminTable headers={[t("common.user"), t("fraud.score"), t("fraud.level"), t("fraud.updatedAt"), t("fraud.actions")]}>
        {data.items.map((risk) => (
          <tr key={risk.userId}>
            <TableCell>
              <Link
                href={`/admin/users/${risk.userId}`}
                className="text-brand-700 hover:underline dark:text-brand-300"
              >
                {risk.user?.profile?.displayName ?? risk.user?.profile?.username ?? risk.user?.email ?? "—"}
              </Link>
            </TableCell>
            <TableCell className="font-bold tabular-nums">{risk.score}</TableCell>
            <TableCell><StatusBadge status={risk.level} /></TableCell>
            <TableCell>{risk.updatedAt.toLocaleDateString(localeFmt)}</TableCell>
            <TableCell>
              {canManage ? (
                <AdminActionButton
                  action={setUserRiskScoreAction}
                  label={t("fraud.setScore")}
                  fixedArgs={{ userId: risk.userId }}
                  title={t("fraud.setScore")}
                  fields={[
                    { name: "score", type: "number", label: t("fraud.score"), required: true },
                    { name: "reason", type: "textarea", label: t("common.reason") },
                  ]}
                />
              ) : null}
            </TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
