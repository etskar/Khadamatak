import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { haversineKm } from "@/server/marketplace/location";
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

  const userLoc = session?.user?.id
    ? await db.userLocation.findUnique({ where: { userId: session.user.id } })
    : null;

  const distanceKm =
    userLoc?.latitude != null &&
    userLoc?.longitude != null &&
    service.latitude != null &&
    service.longitude != null
      ? haversineKm(
          userLoc.latitude,
          userLoc.longitude,
          service.latitude,
          service.longitude,
        )
      : null;

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
        country: service.country,
        latitude: service.latitude,
        longitude: service.longitude,
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
        travel:
          distanceKm != null && userLoc?.latitude != null && userLoc.longitude != null
            ? {
                originLat: userLoc.latitude,
                originLng: userLoc.longitude,
                destLat: service.latitude ?? 0,
                destLng: service.longitude ?? 0,
                distanceKm,
              }
            : null,
      }}
      labels={{
        contact: t("contactProvider"),
        save: t("save"),
        verified: t("verified"),
        loginRequired: t("loginRequired"),
        location: t("location"),
        travelTime: t("travelTime"),
        directions: t("directions"),
        viewOnMap: t("viewOnMap"),
        minutesShort: t("minutesShort"),
      }}
    />
  );
}
