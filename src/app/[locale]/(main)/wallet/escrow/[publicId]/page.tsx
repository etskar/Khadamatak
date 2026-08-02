import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { EscrowDetailClient } from "@/components/wallet/escrow-detail-client";

export default async function EscrowDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("wallet");
  const session = await auth();
  if (!session?.user?.id) notFound();

  const escrow = await db.escrow.findUnique({
    where: { publicId },
    include: {
      buyer: { include: { profile: true } },
      seller: { include: { profile: true } },
      events: { orderBy: { createdAt: "asc" } },
      dispute: true,
    },
  });
  if (!escrow) notFound();
  if (
    escrow.buyerId !== session.user.id &&
    escrow.sellerId !== session.user.id
  ) {
    notFound();
  }

  return (
    <EscrowDetailClient
      publicId={escrow.publicId}
      status={escrow.status}
      amountLabel={formatMoney(
        escrow.amountCents,
        escrow.currency,
        locale === "ar" ? "ar" : "nl-NL",
      )}
      description={escrow.description}
      isBuyer={escrow.buyerId === session.user.id}
      isSeller={escrow.sellerId === session.user.id}
      buyerName={escrow.buyer.profile?.displayName ?? "Buyer"}
      sellerName={escrow.seller.profile?.displayName ?? "Seller"}
      events={escrow.events.map((e) => ({
        id: e.id,
        type: e.type,
        message: e.message,
        createdAt: e.createdAt.toISOString(),
      }))}
      disputePublicId={escrow.dispute?.publicId ?? null}
      labels={{
        title: t("escrow"),
        markDelivered: t("markDelivered"),
        confirmDelivery: t("confirmDelivery"),
        openDispute: t("openDispute"),
        timeline: t("timeline"),
        deliveredSuccess: t("deliveredSuccess"),
        confirmedSuccess: t("confirmedSuccess"),
        disputeLabel: t("disputeLabel"),
      }}
    />
  );
}
