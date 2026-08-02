import { getTranslations, setRequestLocale } from "next-intl/server";
import { Flag, Target, User } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listFeatureFlags, getFeatureFlagStats } from "@/server/admin/flags";
import {
  setFeatureFlagAction,
  deleteFeatureFlagAction,
  createFeatureFlagAction,
} from "@/server/actions/admin-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.flags")} · ${t("title")}` };
}

export default async function AdminFlagsPage({
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

  const { ctx, forbidden } = await requireAdminPage(locale, "flags.manage");
  if (forbidden) return <AccessDenied />;

  const canManage = ctx.permissions.has("flags.manage");

  const [stats, data] = await Promise.all([
    getFeatureFlagStats(),
    listFeatureFlags({ enabled: sp.enabled === "true" ? true : sp.enabled === "false" ? false : undefined, page: sp.page ? Number(sp.page) : 1 }),
  ]);

  const totalPages = Math.ceil(data.total / data.pageSize);

  const cards = [
    { label: t("flags.total"), value: stats.total.toLocaleString(localeFmt), icon: <Flag className="h-5 w-5" /> },
    { label: t("flags.enabled"), value: stats.enabled.toLocaleString(localeFmt), icon: <Target className="h-5 w-5" /> },
    { label: t("flags.enabledRate"), value: stats.total ? `${Math.round((stats.enabled / stats.total) * 100)}%` : "0%", icon: <User className="h-5 w-5" /> },
  ];

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("nav.flags")}
        description={t("flags.subtitle")}
        actions={
          canManage ? (
            <AdminActionButton
              action={createFeatureFlagAction}
              label={t("flags.new")}
              title={t("flags.new")}
              fields={[
                { name: "key", label: t("flags.key"), required: true },
                { name: "label", label: t("flags.label") },
                { name: "description", label: t("flags.description") },
                { name: "enabled", label: t("flags.enabled") },
              ]}
            />
          ) : null
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <AdminTable headers={[t("flags.key"), t("flags.label"), t("flags.description"), t("flags.enabled"), t("flags.updatedAt"), t("flags.actions")]}>
        {data.items.map((flag) => (
          <tr key={flag.key}>
            <TableCell className="font-mono font-medium text-foreground">{flag.key}</TableCell>
            <TableCell>{flag.label}</TableCell>
            <TableCell className="max-w-56 truncate text-muted-foreground">{flag.description ?? "—"}</TableCell>
            <TableCell><StatusBadge status={flag.enabled ? "active" : "disabled"} /></TableCell>
            <TableCell>{flag.updatedAt ? flag.updatedAt.toLocaleString(localeFmt) : "—"}</TableCell>
            <TableCell>
              {canManage ? (
                <div className="flex flex-wrap gap-1.5">
                  <AdminActionButton action={setFeatureFlagAction} label={flag.enabled ? tAct("disable") : tAct("enable")} fixedArgs={{ key: flag.key, enabled: !flag.enabled }} confirm={false} variant={flag.enabled ? "soft" : "outline"} />
                  <AdminActionButton action={deleteFeatureFlagAction} label={tAct("delete")} fixedArgs={{ key: flag.key }} title={tAct("delete")} danger />
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
