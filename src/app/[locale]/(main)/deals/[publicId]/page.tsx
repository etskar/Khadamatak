import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getDeal } from "@/server/marketplace/deal-service";
import { formatMoney } from "@/lib/money";
import { DealDetailClient } from "@/components/marketplace/deal-detail-client";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const t = await getTranslations("marketplace");

  let deal;
  try {
    deal = await getDeal(publicId, session.user.id);
  } catch {
    notFound();
  }
  if (!deal) notFound();

  return (
    <DealDetailClient
      deal={{
        publicId: deal.publicId,
        status: deal.status,
        paymentStatus: deal.paymentStatus,
        amountLabel: formatMoney(
          deal.amountCents,
          deal.currency,
          locale === "ar" ? "ar" : "nl-NL",
        ),
        terms: deal.terms,
        isBuyer: deal.buyerId === session.user.id,
        isSeller: deal.sellerId === session.user.id,
        title: deal.product?.title || deal.service?.title || deal.publicId,
        buyerName: deal.buyer.profile?.displayName ?? "Buyer",
        sellerName: deal.seller.profile?.displayName ?? "Seller",
        orderPublicId: deal.order?.publicId ?? null,
        escrowPublicId: deal.escrow?.publicId ?? null,
        events: deal.events.map((e) => ({
          id: e.id,
          type: e.type,
          message: e.message,
          createdAt: e.createdAt.toISOString(),
        })),
      }}
      labels={{
        accept: t("accept"),
        reject: t("reject"),
        payEscrow: t("payEscrow"),
        openOrder: t("openOrder"),
        timeline: t("timeline"),
      }}
    />
  );
}
