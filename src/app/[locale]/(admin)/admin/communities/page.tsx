import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listGroups } from "@/server/admin/communities";

const GROUP_STATUSES = ["active", "locked", "archived"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.communities")} · ${t("title")}` };
}

export default async function AdminCommunitiesPage({
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

  const { forbidden } = await requireAdminPage(locale, "communities.view");
  if (forbidden) return <AccessDenied />;

  const data = await listGroups({
    status: sp.status,
    query: sp.query,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.communities")} description={t("communities.subtitle")} />

      <AdminToolbar
        searchPlaceholder={t("communities.search")}
        filters={[
          {
            param: "status",
            label: t("common.status"),
            allLabel: t("common.all"),
            options: GROUP_STATUSES.map((s) => ({
              value: s,
              label: t(`status.${s}`, { defaultValue: s }),
            })),
          },
        ]}
      />

      <AdminTable
        headers={[
          t("communities.name"),
          t("communities.city"),
          t("communities.members"),
          t("communities.posts"),
          t("communities.products"),
          t("communities.services"),
          t("common.status"),
          t("common.date"),
        ]}
      >
        {data.items.map((group) => (
          <tr key={group.id}>
            <TableCell>
              <Link
                href={`/admin/communities/${group.id}`}
                className="font-medium text-brand-700 hover:underline dark:text-brand-300"
              >
                {group.name}
              </Link>
            </TableCell>
            <TableCell>{group.city}</TableCell>
            <TableCell>{group.memberCount}</TableCell>
            <TableCell>{group._count.posts}</TableCell>
            <TableCell>{group._count.products}</TableCell>
            <TableCell>{group._count.services}</TableCell>
            <TableCell>
              <StatusBadge status={group.status} />
            </TableCell>
            <TableCell>{group.createdAt.toLocaleDateString(localeFmt)}</TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
