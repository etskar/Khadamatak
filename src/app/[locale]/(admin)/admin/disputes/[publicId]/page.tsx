import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, MessageSquare, ScrollText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getDisputeDetail } from "@/server/admin/disputes";
import {
  adminResolveDisputeAction,
  closeDisputeAction,
  requestDisputeEvidenceAction,
  postDisputeMessageAction,
} from "@/server/actions/admin-actions";
import { formatMoney } from "@/lib/money";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-end text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tAct = await getTranslations("admin.actions");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "disputes.view");
  if (forbidden) return <AccessDenied />;

  const dispute = await getDisputeDetail(publicId);
  if (!dispute) notFound();

  const canResolve = ctx.permissions.has("disputes.resolve");
  const canManage = ctx.permissions.has("disputes.manage");
  const isOpen = ["open", "under_review"].includes(dispute.status);

  return (
    <div className="animate-in-up">
      <Link
        href="/admin/disputes"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <PageHeader
        title={<span className="font-mono">{dispute.publicId}</span>}
        description={`${t("nav.disputes")} · ${dispute.createdAt.toLocaleDateString(localeFmt)}`}
        actions={<StatusBadge status={dispute.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.details")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row
              label={t("disputes.reason")}
              value={dispute.reason}
            />
            <Row
              label={t("disputes.openedBy")}
              value={dispute.openedBy?.profile?.displayName ?? dispute.openedBy?.profile?.username ?? "—"}
            />
            <Row label={t("escrow.buyer")} value={dispute.escrow?.buyer?.profile?.displayName ?? dispute.escrow?.buyer?.profile?.username ?? "—"} />
            <Row label={t("escrow.seller")} value={dispute.escrow?.seller?.profile?.displayName ?? dispute.escrow?.seller?.profile?.username ?? "—"} />
            <Row
              label={t("common.amount")}
              value={formatMoney(dispute.escrow?.amountCents ?? 0, "EUR", localeFmt)}
            />
            <Row label={t("orders.dispute")} value={dispute.escrow?.publicId ?? "—"} />
          </CardContent>
        </Card>
      </div>

      {isOpen && (canResolve || canManage) ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canResolve ? (
            <>
              <AdminActionButton
                action={adminResolveDisputeAction}
                label={tAct("resolveBuyer")}
                fixedArgs={{ disputePublicId: publicId, decision: "refund" }}
                title={tAct("resolveBuyer")}
                fields={[{ name: "resolution", type: "textarea", label: t("common.note") }]}
              />
              <AdminActionButton
                action={adminResolveDisputeAction}
                label={tAct("resolveSeller")}
                fixedArgs={{ disputePublicId: publicId, decision: "release" }}
                title={tAct("resolveSeller")}
                fields={[{ name: "resolution", type: "textarea", label: t("common.note") }]}
              />
              <AdminActionButton
                action={requestDisputeEvidenceAction}
                label={tAct("requestEvidence")}
                fixedArgs={{ disputePublicId: publicId }}
                title={tAct("requestEvidence")}
                fields={[{ name: "message", type: "textarea", label: t("common.note") }]}
                variant="soft"
              />
              <AdminActionButton
                action={closeDisputeAction}
                label={tAct("close")}
                fixedArgs={{ disputePublicId: publicId }}
                title={tAct("close")}
                fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
                variant="soft"
              />
            </>
          ) : null}
          {canManage ? (
            <AdminActionButton
              action={postDisputeMessageAction}
              label={tAct("postMessage")}
              fixedArgs={{ disputePublicId: publicId }}
              title={tAct("postMessage")}
              fields={[{ name: "content", type: "textarea", label: t("common.message"), required: true }]}
              variant="soft"
            />
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquare className="h-4 w-4" />
            {t("disputes.messages")}
          </h3>
          <div className="space-y-2">
            {dispute.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              dispute.messages.map((message) => (
                <Card key={message.id} className="p-3">
                  <p className="text-sm text-foreground">{message.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {message.createdAt.toLocaleString(localeFmt)}
                  </p>
                </Card>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <ScrollText className="h-4 w-4" />
            {t("orders.timeline")}
          </h3>
          <div className="space-y-2">
            {dispute.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              dispute.events.map((event) => (
                <Card key={event.id} className="p-3">
                  <p className="text-sm font-medium text-foreground">
                    {event.type}
                    {event.message ? ` — ${event.message}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.createdAt.toLocaleString(localeFmt)}
                  </p>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {dispute.evidence.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {t("disputes.evidence")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {dispute.evidence.map((item) => (
              <Card key={item.id} className="p-3 text-sm">
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-700 hover:underline dark:text-brand-300"
                >
                  {item.fileName}
                </a>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
