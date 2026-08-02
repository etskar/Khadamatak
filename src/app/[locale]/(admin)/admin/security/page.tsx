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
import { listSecurityEvents } from "@/server/admin/security";
import { acknowledgeSecurityEventAction } from "@/server/actions/admin-actions";

const SEVERITIES = ["low", "medium", "high", "critical"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.security")} · ${t("title")}` };
}

export default async function AdminSecurityPage({
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

  const { ctx, forbidden } = await requireAdminPage(locale, "security.view");
  if (forbidden) return <AccessDenied />;

  const canManage = ctx.permissions.has("security.manage");

  const data = await listSecurityEvents({
    severity: sp.severity,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.security")} description={t("security.subtitle")} />

      <AdminToolbar
        searchPlaceholder={t("security.search")}
        filters={[
          {
            param: "severity",
            label: t("security.severity"),
            allLabel: t("common.all"),
            options: SEVERITIES.map((s) => ({
              value: s,
              label: t(`status.${s}`, { defaultValue: s }),
            })),
          },
        ]}
      />

      <AdminTable headers={[t("common.date"), t("security.severity"), t("security.title"), t("common.user"), t("common.status"), t("security.actions")]}>
        {data.items.map((event) => (
          <tr key={event.id}>
            <TableCell>{event.createdAt.toLocaleString(localeFmt)}</TableCell>
            <TableCell><StatusBadge status={event.severity} /></TableCell>
            <TableCell className="max-w-72">
              <p className="truncate font-medium text-foreground">{event.title}</p>
              {event.description ? (
                <p className="truncate text-xs text-muted-foreground">{event.description}</p>
              ) : null}
            </TableCell>
            <TableCell>
              {event.user ? (
                <Link
                  href={`/admin/users/${event.user.id}`}
                  className="text-brand-700 hover:underline dark:text-brand-300"
                >
                  {event.user.profile?.displayName ?? event.user.profile?.username ?? event.user.email}
                </Link>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell>
              <StatusBadge status={event.acknowledgedAt ? "resolved" : "pending"} />
            </TableCell>
            <TableCell>
              {canManage && !event.acknowledgedAt ? (
                <AdminActionButton
                  action={acknowledgeSecurityEventAction}
                  label={t("security.acknowledge")}
                  fixedArgs={{ id: event.id }}
                  confirm={false}
                  variant="soft"
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
