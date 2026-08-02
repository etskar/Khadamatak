import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getServiceByPublicId } from "@/server/marketplace/service-service";
import { ServiceDetailClient } from "@/components/marketplace/service-detail-client";
import { formatMoney } from "@/lib/money";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const session = await auth();
  const service = await getServiceByPublicId(publicId, session?.user?.id);
  if (!service) notFound();

  return (
    <ServiceDetailClient
      service={{
        publicId: service.publicId,
        id: service.id,
        title: service.title,
        description: service.description,
        priceLabel:
          service.priceCents != null
            ? formatMoney(
                service.priceCents,
                service.currency,
                locale === "ar" ? "ar" : "nl-NL",
              ) + (service.pricingType === "hourly" ? "/h" : "")
            : service.pricingType === "quote"
              ? t("customQuote")
              : null,
        pricingType: service.pricingType,
        availability: service.availability,
        workingHours: service.workingHours,
        city: service.city,
        ratingAvg: service.ratingAvg,
        ratingCount: service.ratingCount,
        favorited: service.favorited,
        media: service.media.map((m) => ({ id: m.id, type: m.type, url: m.url })),
        provider: {
          id: service.provider.id,
          name: service.provider.profile?.displayName ?? "Provider",
          username: service.provider.profile?.username ?? "",
          avatarUrl: service.provider.profile?.avatarUrl,
          verified: service.provider.verification?.status === "verified",
        },
        isOwner: session?.user?.id === service.providerId,
        hasFixedPrice: service.priceCents != null && service.pricingType !== "quote",
      }}
      labels={{
        book: t("bookNow"),
        contact: t("contactProvider"),
        save: t("save"),
        offer: t("makeOffer"),
        verified: t("verified"),
        reviews: t("reviews"),
        customAmount: t("customAmount"),
      }}
    />
  );
}
