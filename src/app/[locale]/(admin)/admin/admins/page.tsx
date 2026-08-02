import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listAdminUsers, listRoles } from "@/server/admin/rbac";
import {
  createAdminUserAction,
  updateAdminUserAction,
  resetAdminPasswordAction,
  deleteAdminUserAction,
} from "@/server/actions/admin-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.admins")} · ${t("title")}` };
}

export default async function AdminAdminsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tAct = await getTranslations("admin.actions");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "rbac.view");
  if (forbidden) return <AccessDenied />;

  const canManage = ctx.permissions.has("rbac.manage");

  const [admins, roles] = await Promise.all([listAdminUsers(), listRoles()]);
  const roleOptions = roles.map((role) => ({ value: role.id, label: role.name }));
  const statusOptions = [
    { value: "active", label: t("status.active") },
    { value: "suspended", label: t("status.suspended") },
    { value: "inactive", label: t("status.inactive") },
  ];

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("nav.admins")}
        description={t("admins.subtitle")}
        actions={
          canManage ? (
            <AdminActionButton
              action={createAdminUserAction}
              label={t("admins.new")}
              title={t("admins.new")}
              fields={[
                { name: "name", label: t("admins.name"), required: true },
                { name: "email", label: t("admins.email"), required: true },
                { name: "password", label: t("admins.password"), required: true },
                { name: "roleId", type: "select", label: t("admins.role"), options: roleOptions, required: true },
              ]}
            />
          ) : null
        }
      />

      <AdminTable headers={[t("admins.name"), t("admins.email"), t("admins.role"), t("common.status"), t("admins.sessions"), t("admins.joined"), t("admins.actions")]}>
        {admins.map((admin) => {
          const isSelf = admin.id === ctx.admin.id;
          const isSuper = admin.role.key === "super_admin";
          return (
            <tr key={admin.id}>
              <TableCell>
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4 text-brand-700 dark:text-brand-300" />
                  <span>{admin.name}</span>
                  {isSelf ? <span className="text-xs text-muted-foreground">({t("admins.you")})</span> : null}
                </div>
              </TableCell>
              <TableCell>{admin.email}</TableCell>
              <TableCell>
                <Badge variant={admin.role.key === "super_admin" ? "success" : "secondary"}>
                  {admin.role.name}
                </Badge>
              </TableCell>
              <TableCell><StatusBadge status={admin.status} /></TableCell>
              <TableCell>{admin._count.sessions}</TableCell>
              <TableCell>{admin.createdAt.toLocaleDateString(localeFmt)}</TableCell>
              <TableCell>
                {canManage ? (
                  <div className="flex flex-wrap gap-1.5">
                    <AdminActionButton
                      action={updateAdminUserAction}
                      label={tAct("edit")}
                      fixedArgs={{ id: admin.id }}
                      fields={[
                        { name: "name", label: t("admins.name") },
                        { name: "roleId", type: "select", label: t("admins.role"), options: roleOptions },
                        { name: "status", type: "select", label: t("common.status"), options: statusOptions },
                      ]}
                    />
                    <AdminActionButton
                      action={resetAdminPasswordAction}
                      label={tAct("resetPassword")}
                      fixedArgs={{ id: admin.id }}
                      fields={[{ name: "newPassword", label: t("admins.newPassword"), required: true }]}
                      variant="soft"
                    />
                    {!isSelf && !isSuper ? (
                      <AdminActionButton action={deleteAdminUserAction} label={tAct("delete")} fixedArgs={{ id: admin.id }} title={t("admins.delete")} danger />
                    ) : null}
                  </div>
                ) : null}
              </TableCell>
            </tr>
          );
        })}
      </AdminTable>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-muted bg-card p-4 text-xs text-muted-foreground">
        <UserCog className="h-4 w-4 shrink-0" />
        <span>{t("admins.roleManageHint")}</span>
      </div>
    </div>
  );
}
