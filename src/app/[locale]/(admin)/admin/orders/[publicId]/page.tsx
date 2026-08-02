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
import { getOrderDetail } from "@/server/admin/orders";
import {
  adminCompleteOrderAction,
  adminCancelOrderAction,
  adminForceRefundAction,
  adminForceReleaseAction,
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

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tAct = await getTranslations("admin.actions");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "orders.view");
  if (forbidden) return <AccessDenied />;

  const order = await getOrderDetail(publicId);
  if (!order) notFound();

  const canComplete = ctx.permissions.has("orders.complete");
  const canCancel = ctx.permissions.has("orders.cancel");
  const canForceRefund = ctx.permissions.has("orders.force_refund");
  const canForceRelease = ctx.permissions.has("orders.force_release");
  const isPending = ["pending_payment", "payment_secured", "processing", "delivered"].includes(
    order.status,
  );

  return (
    <div className="animate-in-up">
      <Link
        href="/admin/orders"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <PageHeader
        title={<span className="font-mono">{order.publicId}</span>}
        description={`${t("nav.orders")} · ${order.createdAt.toLocaleDateString(localeFmt)}`}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.details")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label={t("orders.buyer")} value={order.buyer?.profile?.displayName ?? order.buyer?.profile?.username ?? "—"} />
            <Row label={t("orders.seller")} value={order.seller?.profile?.displayName ?? order.seller?.profile?.username ?? "—"} />
            <Row
              label={t("common.item")}
              value={order.product?.title ?? order.service?.title ?? "—"}
            />
            <Row label={t("common.status")} value={<StatusBadge status={order.status} />} />
            <Row label={t("orders.paymentStatus")} value={<StatusBadge status={order.paymentStatus} />} />
            <Row label={t("orders.delivery")} value={<StatusBadge status={order.deliveryStatus} />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("orders.payment")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Row label={t("common.amount")} value={formatMoney(order.amountCents, "EUR", localeFmt)} />
            <Row label={t("orders.platformFee")} value={formatMoney(order.platformFeeCents, "EUR", localeFmt)} />
            <Row label={t("orders.sellerAmount")} value={formatMoney(order.sellerAmountCents, "EUR", localeFmt)} />
            <Row
              label={t("nav.escrow")}
              value={
                order.escrow ? (
                  <Link
                    href={`/admin/escrow/${order.escrow.publicId}`}
                    className="font-mono text-brand-700 hover:underline dark:text-brand-300"
                  >
                    {order.escrow.publicId}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>
      </div>

      {isPending && (canComplete || canCancel || canForceRefund || canForceRelease) ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canComplete ? (
            <AdminActionButton
              action={adminCompleteOrderAction}
              label={tAct("complete")}
              fixedArgs={{ publicId }}
              title={tAct("complete")}
              fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
            />
          ) : null}
          {canCancel ? (
            <AdminActionButton
              action={adminCancelOrderAction}
              label={tAct("cancel")}
              fixedArgs={{ publicId }}
              title={tAct("cancel")}
              fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
            />
          ) : null}
          {canForceRefund ? (
            <AdminActionButton
              action={adminForceRefundAction}
              label={tAct("forceRefund")}
              fixedArgs={{ publicId }}
              title={tAct("forceRefund")}
              fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
              danger
            />
          ) : null}
          {canForceRelease ? (
            <AdminActionButton
              action={adminForceReleaseAction}
              label={tAct("forceRelease")}
              fixedArgs={{ publicId }}
              title={tAct("forceRelease")}
              fields={[{ name: "note", type: "textarea", label: t("common.note") }]}
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
          {order.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            order.events.map((event) => (
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
