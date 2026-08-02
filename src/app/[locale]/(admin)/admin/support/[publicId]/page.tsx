import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getTicket } from "@/server/admin/support";
import {
  replyToTicketAction,
  assignTicketAction,
  escalateTicketAction,
  mergeTicketsAction,
  setTicketStatusAction,
} from "@/server/actions/admin-actions";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-end text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tAct = await getTranslations("admin.actions");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "support.view");
  if (forbidden) return <AccessDenied />;

  const ticket = await getTicket(publicId);
  if (!ticket) notFound();

  const canManage = ctx.permissions.has("support.manage");
  const canAssign = ctx.permissions.has("support.assign");
  const canEscalate = ctx.permissions.has("support.escalate");
  const canMerge = ctx.permissions.has("support.merge");
  const isOpen = ticket.status !== "closed" && ticket.status !== "merged";

  return (
    <div className="animate-in-up">
      <Link
        href="/admin/support"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <PageHeader
        title={ticket.subject}
        description={
          <span className="flex items-center gap-2">
            <span className="font-mono">{ticket.publicId}</span>
            <StatusBadge status={ticket.priority} />
            {ticket.escalated ? (
              <StatusBadge status="escalated" />
            ) : null}
          </span>
        }
        actions={<StatusBadge status={ticket.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.details")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row
              label={t("common.user")}
              value={ticket.user?.profile?.displayName ?? ticket.user?.profile?.username ?? ticket.user?.email ?? "—"}
            />
            <Row label={t("support.category")} value={t(`support.category.${ticket.category}`, { defaultValue: ticket.category })} />
            <Row
              label={t("support.assignedTo")}
              value={ticket.assignedTo?.name ?? "—"}
            />
            <Row label={t("support.createdAt")} value={ticket.createdAt.toLocaleString(localeFmt)} />
          </CardContent>
        </Card>
      </div>

      {isOpen && (canManage || canAssign || canEscalate || canMerge) ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canManage ? (
            <AdminActionButton
              action={replyToTicketAction}
              label={tAct("reply")}
              fixedArgs={{ ticketPublicId: publicId }}
              title={tAct("reply")}
              fields={[{ name: "content", type: "textarea", label: t("common.message"), required: true }]}
            />
          ) : null}
          {canAssign ? (
            <AdminActionButton
              action={assignTicketAction}
              label={tAct("assign")}
              fixedArgs={{ ticketPublicId: publicId }}
              confirm={false}
              variant="soft"
            />
          ) : null}
          {canEscalate ? (
            <AdminActionButton
              action={escalateTicketAction}
              label={tAct("escalate")}
              fixedArgs={{ ticketPublicId: publicId }}
              title={tAct("escalate")}
              fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
            />
          ) : null}
          {canMerge ? (
            <AdminActionButton
              action={mergeTicketsAction}
              label={tAct("merge")}
              fixedArgs={{ targetPublicId: publicId }}
              title={tAct("merge")}
              fields={[{ name: "intoPublicId", label: t("support.mergeInto"), required: true }]}
              variant="soft"
            />
          ) : null}
          {canManage ? (
            <AdminActionButton
              action={setTicketStatusAction}
              label={tAct("close")}
              fixedArgs={{ ticketPublicId: publicId, status: "closed" }}
              title={tAct("close")}
              variant="soft"
            />
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageSquare className="h-4 w-4" />
          {t("support.messages")}
        </h3>
        <div className="space-y-2">
          {ticket.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            ticket.messages.map((message) => (
              <Card key={message.id} className="p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {message.authorType === "admin" ? t("support.admin") : message.authorType === "system" ? t("support.system") : (ticket.user?.profile?.displayName ?? ticket.user?.profile?.username ?? "—")}
                  </span>
                  <span>{message.createdAt.toLocaleString(localeFmt)}</span>
                </div>
                <p className="text-sm text-foreground">{message.content}</p>
                {message.attachments.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-700 hover:underline dark:text-brand-300"
                      >
                        {att.fileName}
                      </a>
                    ))}
                  </div>
                ) : null}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
