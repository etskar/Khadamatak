import { getTranslations, setRequestLocale } from "next-intl/server";
import { Bell, MailOpen, Calendar, Type } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listRecentNotifications, getNotificationStats } from "@/server/admin/notifications";
import { clearOldNotificationsAction } from "@/server/actions/admin-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.notifications")} · ${t("title")}` };
}

export default async function AdminNotificationsPage({
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

  const { ctx, forbidden } = await requireAdminPage(locale, "notifications.manage");
  if (forbidden) return <AccessDenied />;

  const canManage = ctx.permissions.has("notifications.manage");

  const [stats, data] = await Promise.all([
    getNotificationStats(),
    listRecentNotifications({ unreadOnly: sp.unread === "1", page: sp.page ? Number(sp.page) : 1 }),
  ]);

  const totalPages = Math.ceil(data.total / data.pageSize);

  const cards = [
    { label: t("notifications.total"), value: stats.total.toLocaleString(localeFmt), icon: <Bell className="h-5 w-5" /> },
    { label: t("notifications.unread"), value: stats.unread.toLocaleString(localeFmt), icon: <MailOpen className="h-5 w-5" /> },
    { label: t("notifications.today"), value: stats.today.toLocaleString(localeFmt), icon: <Calendar className="h-5 w-5" /> },
    { label: t("notifications.topTypes"), value: stats.topTypes.length.toLocaleString(localeFmt), icon: <Type className="h-5 w-5" /> },
  ];

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("nav.notifications")}
        description={t("notifications.subtitle")}
        actions={
          canManage ? (
            <AdminActionButton
              action={clearOldNotificationsAction}
              label={t("notifications.purge")}
              title={t("notifications.purge")}
              fields={[{ name: "olderThanDays", type: "number", label: t("notifications.olderThanDays"), required: true }]}
              danger
            />
          ) : null
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <AdminTable headers={[t("common.date"), t("notifications.type"), t("notifications.title"), t("common.user"), t("common.status")]}>
        {data.items.map((notification) => (
          <tr key={notification.id}>
            <TableCell>{notification.createdAt.toLocaleString(localeFmt)}</TableCell>
            <TableCell><StatusBadge status={notification.type} /></TableCell>
            <TableCell className="max-w-56 truncate font-medium text-foreground">{notification.title}</TableCell>
            <TableCell>
              {notification.user?.profile?.displayName ??
                notification.user?.profile?.username ??
                notification.user?.email ??
                "—"}
            </TableCell>
            <TableCell><StatusBadge status={notification.readAt ? "read" : "unread"} /></TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
