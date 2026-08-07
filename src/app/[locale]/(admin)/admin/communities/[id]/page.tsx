import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { GroupCoverUpload } from "@/components/admin/group-cover-upload";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getGroupDetail } from "@/server/admin/communities";
import {
  setGroupStatusAction,
  transferGroupOwnershipAction,
  removeGroupMemberAction,
} from "@/server/actions/admin-actions";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-end text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tAct = await getTranslations("admin.actions");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "communities.view");
  if (forbidden) return <AccessDenied />;

  const group = await getGroupDetail(id);
  if (!group) notFound();

  const canManage = ctx.permissions.has("communities.manage");
  const canTransfer = ctx.permissions.has("communities.transfer_ownership");
  const canRemove = ctx.permissions.has("communities.remove_members");

  return (
    <div className="animate-in-up">
      <Link
        href="/admin/communities"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <PageHeader
        title={group.name}
        description={group.city}
        actions={<StatusBadge status={group.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.details")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row
              label={t("communities.owner")}
              value={
                group.createdBy?.profile?.displayName ??
                group.createdBy?.profile?.username ??
                group.createdBy?.email ??
                "—"
              }
            />
            <Row label={t("communities.city")} value={group.city} />
            <Row label={t("communities.members")} value={group.memberCount} />
            <Row label={t("common.status")} value={<StatusBadge status={group.status} />} />
            <Row
              label={t("communities.createdAt")}
              value={group.createdAt.toLocaleDateString(localeFmt)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("communities.coverImage")}</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupCoverUpload groupId={group.id} coverUrl={group.coverUrl} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canManage ? (
          <>
            {group.status === "active" ? (
              <AdminActionButton
                action={setGroupStatusAction}
                label={tAct("lock")}
                fixedArgs={{ groupId: id, action: "lock" }}
                confirm={false}
              />
            ) : null}
            {group.status === "locked" ? (
              <AdminActionButton
                action={setGroupStatusAction}
                label={tAct("restore")}
                fixedArgs={{ groupId: id, action: "restore" }}
                confirm={false}
                variant="soft"
              />
            ) : null}
            {group.status !== "archived" ? (
              <>
                <AdminActionButton
                  action={setGroupStatusAction}
                  label={tAct("archive")}
                  fixedArgs={{ groupId: id, action: "archive" }}
                  confirm={false}
                />
                <AdminActionButton
                  action={setGroupStatusAction}
                  label={tAct("delete")}
                  fixedArgs={{ groupId: id, action: "delete" }}
                  title={tAct("delete")}
                  danger
                />
              </>
            ) : null}
          </>
        ) : null}
        {canTransfer ? (
          <AdminActionButton
            action={transferGroupOwnershipAction}
            label={tAct("transferOwnership")}
            fixedArgs={{ groupId: id }}
            title={tAct("transferOwnership")}
            fields={[{ name: "newOwnerUserId", label: t("communities.ownerId"), required: true }]}
          />
        ) : null}
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          {t("communities.members")}
        </h3>
        <AdminTable headers={[t("common.user"), t("communities.role"), t("common.status"), t("communities.joinedAt"), t("communities.actions")]}>
          {group.members.map((member) => (
            <tr key={member.id}>
              <TableCell>
                {member.user?.profile?.displayName ??
                  member.user?.profile?.username ??
                  member.user?.email ??
                  "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={member.role} />
              </TableCell>
              <TableCell>
                <StatusBadge status={member.status} />
              </TableCell>
              <TableCell>
                {member.joinedAt ? member.joinedAt.toLocaleDateString(localeFmt) : "—"}
              </TableCell>
              <TableCell>
                {canRemove && member.role !== "admin" ? (
                  <AdminActionButton
                    action={removeGroupMemberAction}
                    label={tAct("remove")}
                    fixedArgs={{ groupId: id, userId: member.userId }}
                    title={tAct("remove")}
                    danger
                  />
                ) : null}
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
    </div>
  );
}
