import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listTickets } from "@/server/admin/support";

const TICKET_STATUSES = ["open", "assigned", "in_progress", "pending", "merged", "closed"];
const TICKET_CATEGORIES = ["payments", "orders", "verification", "wallet", "technical", "marketplace", "abuse"];
const TICKET_PRIORITIES = ["low", "medium", "high", "critical"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.support")} · ${t("title")}` };
}

export default async function AdminSupportPage({
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

  const { forbidden } = await requireAdminPage(locale, "support.view");
  if (forbidden) return <AccessDenied />;

  const data = await listTickets({
    status: sp.status,
    category: sp.category,
    priority: sp.priority,
    query: sp.query,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.support")} description={t("support.subtitle")} />

      <AdminToolbar
        searchPlaceholder={t("support.search")}
        filters={[
          {
            param: "status",
            label: t("common.status"),
            allLabel: t("common.all"),
            options: TICKET_STATUSES.map((s) => ({
              value: s,
              label: t(`status.${s}`, { defaultValue: s }),
            })),
          },
          {
            param: "category",
            label: t("support.category"),
            allLabel: t("common.all"),
            options: TICKET_CATEGORIES.map((s) => ({
              value: s,
              label: t(`support.category.${s}`, { defaultValue: s }),
            })),
          },
          {
            param: "priority",
            label: t("support.priority"),
            allLabel: t("common.all"),
            options: TICKET_PRIORITIES.map((s) => ({
              value: s,
              label: t(`status.${s}`, { defaultValue: s }),
            })),
          },
        ]}
      />

      <AdminTable
        headers={[
          t("common.id"),
          t("support.subject"),
          t("support.category"),
          t("common.user"),
          t("support.priority"),
          t("common.status"),
          t("support.messages"),
          t("common.date"),
        ]}
      >
        {data.items.map((ticket) => (
          <tr key={ticket.id}>
            <TableCell>
              <Link
                href={`/admin/support/${ticket.publicId}`}
                className="font-mono text-brand-700 hover:underline dark:text-brand-300"
              >
                {ticket.publicId}
              </Link>
            </TableCell>
            <TableCell className="max-w-56 truncate font-medium text-foreground">
              {ticket.subject}
            </TableCell>
            <TableCell>{t(`support.category.${ticket.category}`, { defaultValue: ticket.category })}</TableCell>
            <TableCell>
              {ticket.user?.profile?.displayName ?? ticket.user?.profile?.username ?? ticket.user?.email ?? "—"}
            </TableCell>
            <TableCell>
              <StatusBadge status={ticket.priority} />
            </TableCell>
            <TableCell>
              <StatusBadge status={ticket.status} />
            </TableCell>
            <TableCell>{ticket._count.messages}</TableCell>
            <TableCell>{ticket.updatedAt.toLocaleDateString(localeFmt)}</TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
