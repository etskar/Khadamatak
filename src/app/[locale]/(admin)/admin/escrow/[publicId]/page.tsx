import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, History } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getEscrowDetail } from "@/server/admin/escrow";
import {
  adminReleaseEscrowAction,
  adminRefundEscrowAction,
  freezeEscrowAction,
  unfreezeEscrowAction,
  investigateEscrowAction,
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

export default async function AdminEscrowDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tAct = await getTranslations("admin.actions");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "escrow.view");
  if (forbidden) return <AccessDenied />;

  const escrow = await getEscrowDetail(publicId);
  if (!escrow) notFound();

  const canRelease = ctx.permissions.has("escrow.release");
  const canRefund = ctx.permissions.has("escrow.refund");
  const canFreeze = ctx.permissions.has("escrow.freeze");
  const canInvestigate = ctx.permissions.has("escrow.investigate");
  const isResolvable = ["funded", "delivered", "frozen", "disputed"].includes(escrow.status);

  return (
    <div className="animate-in-up">
      <Link
        href="/admin/escrow"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <PageHeader
        title={<span className="font-mono">{escrow.publicId}</span>}
        description={`${t("nav.escrow")} · ${escrow.createdAt.toLocaleDateString(localeFmt)}`}
        actions={<StatusBadge status={escrow.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.details")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label={t("escrow.buyer")} value={escrow.buyer?.profile?.displayName ?? escrow.buyer?.profile?.username ?? "—"} />
            <Row label={t("escrow.seller")} value={escrow.seller?.profile?.displayName ?? escrow.seller?.profile?.username ?? "—"} />
            <Row label={t("common.amount")} value={formatMoney(escrow.amountCents, "EUR", localeFmt)} />
            <Row label={t("common.status")} value={<StatusBadge status={escrow.status} />} />
            <Row label={t("escrow.description")} value={escrow.description ?? "—"} />
            <Row
              label={t("orders.dispute")}
              value={
                escrow.dispute ? (
                  <Link
                    href={`/admin/disputes/${escrow.dispute.publicId}`}
                    className="text-brand-700 hover:underline dark:text-brand-300"
                  >
                    {escrow.dispute.publicId}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("escrow.milestones")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label={t("escrow.fundedAt")} value={escrow.fundedAt ? escrow.fundedAt.toLocaleDateString(localeFmt) : "—"} />
            <Row label={t("escrow.deliveredAt")} value={escrow.deliveredAt ? escrow.deliveredAt.toLocaleDateString(localeFmt) : "—"} />
            <Row label={t("escrow.releasedAt")} value={escrow.releasedAt ? escrow.releasedAt.toLocaleDateString(localeFmt) : "—"} />
            <Row label={t("escrow.refundedAt")} value={escrow.refundedAt ? escrow.refundedAt.toLocaleDateString(localeFmt) : "—"} />
            <Row label={t("escrow.autoReleaseAt")} value={escrow.autoReleaseAt ? escrow.autoReleaseAt.toLocaleDateString(localeFmt) : "—"} />
          </CardContent>
        </Card>
      </div>

      {isResolvable && (canRelease || canRefund || canFreeze || canInvestigate) ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canRelease ? (
            <AdminActionButton
              action={adminReleaseEscrowAction}
              label={tAct("release")}
              fixedArgs={{ publicId }}
              title={tAct("release")}
              fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
            />
          ) : null}
          {canRefund ? (
            <AdminActionButton
              action={adminRefundEscrowAction}
              label={tAct("refund")}
              fixedArgs={{ publicId }}
              title={tAct("refund")}
              fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
              danger
            />
          ) : null}
          {canFreeze && escrow.status !== "frozen" ? (
            <AdminActionButton
              action={freezeEscrowAction}
              label={tAct("freeze")}
              fixedArgs={{ publicId }}
              title={tAct("freeze")}
              fields={[{ name: "reason", type: "textarea", label: t("common.reason") }]}
            />
          ) : null}
          {canFreeze && escrow.status === "frozen" ? (
            <AdminActionButton
              action={unfreezeEscrowAction}
              label={tAct("unfreeze")}
              fixedArgs={{ publicId }}
              confirm={false}
              variant="soft"
            />
          ) : null}
          {canInvestigate ? (
            <AdminActionButton
              action={investigateEscrowAction}
              label={tAct("investigate")}
              fixedArgs={{ publicId }}
              title={tAct("investigate")}
              fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
              variant="soft"
            />
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4" />
          {t("orders.timeline")}
        </h3>
        <div className="space-y-2">
          {escrow.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            escrow.events.map((event) => (
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
  );
}
