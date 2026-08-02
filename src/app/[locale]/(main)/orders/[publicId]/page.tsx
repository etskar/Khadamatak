import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getOrder } from "@/server/marketplace/order-service";
import { formatMoney } from "@/lib/money";
import { OrderDetailClient } from "@/components/marketplace/order-detail-client";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const t = await getTranslations("marketplace");

  let order;
  try {
    order = await getOrder(publicId, session.user.id);
  } catch {
    notFound();
  }
  if (!order) notFound();

  return (
    <OrderDetailClient
      order={{
        publicId: order.publicId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        amountLabel: formatMoney(
          order.amountCents,
          order.currency,
          locale === "ar" ? "ar" : "nl-NL",
        ),
        feeLabel: formatMoney(
          order.platformFeeCents,
          order.currency,
          locale === "ar" ? "ar" : "nl-NL",
        ),
        sellerAmountLabel: formatMoney(
          order.sellerAmountCents,
          order.currency,
          locale === "ar" ? "ar" : "nl-NL",
        ),
        title: order.product?.title || order.service?.title || order.publicId,
        isBuyer: order.buyerId === session.user.id,
        isSeller: order.sellerId === session.user.id,
        canReview: order.status === "completed" && !order.review && order.buyerId === session.user.id,
        hasReview: Boolean(order.review),
        invoiceNumber: order.invoice?.invoiceNumber ?? null,
        escrowPublicId: order.escrow?.publicId ?? null,
        events: order.events.map((e) => ({
          id: e.id,
          type: e.type,
          message: e.message,
          createdAt: e.createdAt.toISOString(),
        })),
      }}
      labels={{
        markDelivered: t("markDelivered"),
        confirm: t("confirmCompletion"),
        review: t("leaveReview"),
        invoice: t("invoice"),
        timeline: t("timeline"),
        platformFee: t("platformFee"),
        sellerReceives: t("sellerReceives"),
        escrow: t("escrow"),
      }}
    />
  );
}
