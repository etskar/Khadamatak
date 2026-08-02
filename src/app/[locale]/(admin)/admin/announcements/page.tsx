import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listAnnouncements } from "@/server/admin/announcements";
import {
  createAnnouncementFlatAction,
  publishAnnouncementAction,
  deleteAnnouncementAction,
} from "@/server/actions/admin-actions";

const STATUSES = ["draft", "scheduled", "published", "archived"];

function jsonText(v: string | null): string {
  if (!v) return "—";
  try {
    const parsed = JSON.parse(v);
    return typeof parsed === "string" ? parsed : (parsed?.nl ?? parsed?.ar ?? "—");
  } catch {
    return v;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.announcements")} · ${t("title")}` };
}

export default async function AdminAnnouncementsPage({
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

  const { ctx, forbidden } = await requireAdminPage(locale, "announcements.manage");
  if (forbidden) return <AccessDenied />;

  const canManage = ctx.permissions.has("announcements.manage");

  const data = await listAnnouncements({
    status: sp.status,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("nav.announcements")}
        description={t("announcements.subtitle")}
        actions={
          canManage ? (
            <AdminActionButton
              action={createAnnouncementFlatAction}
              label={t("announcements.new")}
              title={t("announcements.new")}
              fields={[
                { name: "type", label: t("announcements.type"), type: "select", options: [{ value: "info", label: "info" }, { value: "warning", label: "warning" }, { value: "maintenance", label: "maintenance" }] },
                { name: "audience", label: t("announcements.audience"), type: "select", options: [{ value: "all", label: "all" }, { value: "verified", label: "verified" }, { value: "sellers", label: "sellers" }, { value: "buyers", label: "buyers" }] },
                { name: "titleAr", label: "Title (AR)", required: true },
                { name: "titleNl", label: "Title (NL)", required: true },
                { name: "bodyAr", type: "textarea", label: "Body (AR)", required: true },
                { name: "bodyNl", type: "textarea", label: "Body (NL)", required: true },
              ]}
            />
          ) : null
        }
      />

      <AdminToolbar
        searchPlaceholder={t("common.search")}
        filters={[
          {
            param: "status",
            label: t("common.status"),
            allLabel: t("common.all"),
            options: STATUSES.map((s) => ({ value: s, label: t(`status.${s}`, { defaultValue: s }) })),
          },
        ]}
      />

      <AdminTable headers={[t("common.id"), t("announcements.title"), t("announcements.type"), t("announcements.audience"), t("common.status"), t("common.date"), t("announcements.actions")]}>
        {data.items.map((announcement) => (
          <tr key={announcement.id}>
            <TableCell className="font-mono">{announcement.publicId}</TableCell>
            <TableCell className="max-w-56 truncate font-medium text-foreground">
              {jsonText(announcement.titleJson)}
            </TableCell>
            <TableCell>{announcement.type}</TableCell>
            <TableCell>{announcement.audience}</TableCell>
            <TableCell><StatusBadge status={announcement.status} /></TableCell>
            <TableCell>{announcement.createdAt.toLocaleDateString(localeFmt)}</TableCell>
            <TableCell>
              {canManage ? (
                <div className="flex flex-wrap gap-1.5">
                  {["draft", "scheduled"].includes(announcement.status) ? (
                    <AdminActionButton action={publishAnnouncementAction} label={tAct("approve")} fixedArgs={{ id: announcement.id }} title={tAct("approve")} variant="soft" />
                  ) : null}
                  <AdminActionButton action={deleteAnnouncementAction} label={tAct("delete")} fixedArgs={{ id: announcement.id }} title={tAct("delete")} danger />
                </div>
              ) : null}
            </TableCell>
          </tr>
        ))}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
