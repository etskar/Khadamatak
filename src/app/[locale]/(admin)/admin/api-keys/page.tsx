import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listApiKeys } from "@/server/admin/api-keys";
import {
  createApiKeyFlatAction,
  rotateApiKeyAction,
  setApiKeyStatusAction,
  deleteApiKeyAction,
} from "@/server/actions/admin-actions";

const STATUSES = ["active", "revoked"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.api")} · ${t("title")}` };
}

export default async function AdminApiKeysPage({
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

  const { ctx, forbidden } = await requireAdminPage(locale, "api.view");
  if (forbidden) return <AccessDenied />;

  const canManage = ctx.permissions.has("api.manage");

  const data = await listApiKeys({
    status: sp.status,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("nav.api")}
        description={t("api.subtitle")}
        actions={
          canManage ? (
            <AdminActionButton
              action={createApiKeyFlatAction}
              label={t("api.new")}
              title={t("api.new")}
              fields={[
                { name: "name", label: t("api.name"), required: true },
                { name: "scopes", label: t("api.scopes") },
                { name: "expiresAt", label: t("api.expiresAt") },
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

      <AdminTable headers={[t("api.name"), t("api.prefix"), t("api.scopes"), t("api.rateLimit"), t("common.status"), t("common.date"), t("api.actions")]}>
        {data.items.map((key) => {
          let scopes: unknown = [];
          try {
            scopes = JSON.parse(key.scopesJson);
          } catch {}
          return (
            <tr key={key.id}>
              <TableCell className="font-medium text-foreground">{key.name}</TableCell>
              <TableCell className="font-mono">{key.prefix}…</TableCell>
              <TableCell className="max-w-48 truncate">
                {Array.isArray(scopes) ? scopes.join(", ") : "—"}
              </TableCell>
              <TableCell>{key.rateLimitPerMinute ?? "—"}</TableCell>
              <TableCell><StatusBadge status={key.status} /></TableCell>
              <TableCell>{key.createdAt.toLocaleDateString(localeFmt)}</TableCell>
              <TableCell>
                {canManage ? (
                  <div className="flex flex-wrap gap-1.5">
                    <AdminActionButton action={rotateApiKeyAction} label={tAct("rotate")} fixedArgs={{ id: key.id }} title={tAct("rotate")} />
                    {key.status === "active" ? (
                      <AdminActionButton action={setApiKeyStatusAction} label={tAct("revoke")} fixedArgs={{ id: key.id, status: "revoked" }} title={tAct("revoke")} danger />
                    ) : (
                      <AdminActionButton action={setApiKeyStatusAction} label={tAct("restore")} fixedArgs={{ id: key.id, status: "active" }} confirm={false} variant="soft" />
                    )}
                    <AdminActionButton action={deleteApiKeyAction} label={tAct("delete")} fixedArgs={{ id: key.id }} title={tAct("delete")} danger />
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
