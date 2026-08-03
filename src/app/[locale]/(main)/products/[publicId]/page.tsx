import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProductByPublicId } from "@/server/marketplace/product-service";
import { ProductDetailClient } from "@/components/marketplace/product-detail-client";
import { formatMoney } from "@/lib/money";
import { db } from "@/lib/db";
import { haversineKm } from "@/server/marketplace/location";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const session = await auth();
  const product = await getProductByPublicId(publicId, session?.user?.id);
  if (!product) notFound();

  const userLoc = session?.user?.id
    ? await db.userLocation.findUnique({ where: { userId: session.user.id } })
    : null;

  const distanceKm =
    userLoc?.latitude != null &&
    userLoc?.longitude != null &&
    product.latitude != null &&
    product.longitude != null
      ? haversineKm(
          userLoc.latitude,
          userLoc.longitude,
          product.latitude,
          product.longitude,
        )
      : null;

  return (
    <ProductDetailClient
      product={{
        publicId: product.publicId,
        id: product.id,
        title: product.title,
        description: product.description,
        priceLabel: formatMoney(
          product.priceCents,
          product.currency,
          locale === "ar" ? "ar" : "nl-NL",
        ),
        condition: product.condition,
        city: product.city,
        country: product.country,
        latitude: product.latitude,
        longitude: product.longitude,
        viewsCount: product.viewsCount,
        favoritesCount: product.favoritesCount,
        favorited: product.favorited,
        media: product.media.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
        })),
        seller: {
          id: product.seller.id,
          name: product.seller.profile?.displayName ?? "Seller",
          username: product.seller.profile?.username ?? "",
          avatarUrl: product.seller.profile?.avatarUrl,
          verified: product.seller.verification?.status === "verified",
        },
        category: product.category
          ? locale === "ar"
            ? product.category.nameAr
            : product.category.nameNl
          : null,
        distanceLabel: distanceKm != null ? `${distanceKm.toFixed(1)} km` : null,
        isOwner: session?.user?.id === product.sellerId,
        publishedAt: product.publishedAt?.toISOString() ?? product.createdAt.toISOString(),
        travel:
          distanceKm != null && userLoc?.latitude != null && userLoc.longitude != null
            ? {
                originLat: userLoc.latitude,
                originLng: userLoc.longitude,
                destLat: product.latitude ?? 0,
                destLng: product.longitude ?? 0,
                distanceKm,
              }
            : null,
      }}
      labels={{
        contact: t("contactSeller"),
        save: t("save"),
        share: t("share"),
        report: t("report"),
        verified: t("verified"),
        views: t("views"),
        condition: t("condition"),
        location: t("location"),
        seller: t("seller"),
        loginRequired: t("loginRequired"),
        noMedia: t("noMedia"),
        travelTime: t("travelTime"),
        directions: t("directions"),
        viewOnMap: t("viewOnMap"),
        minutesShort: t("minutesShort"),
      }}
    />
  );
}
