import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listProducts } from "@/server/marketplace/product-service";
import { listServices } from "@/server/marketplace/service-service";
import { listGroups } from "@/server/marketplace/group-service";
import { PageHeader } from "@/components/shared/page-header";
import { MapExplorer } from "@/components/marketplace/map-explorer";

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const session = await auth();
  const userLoc = session?.user?.id
    ? await db.userLocation.findUnique({ where: { userId: session.user.id } })
    : null;

  const center = {
    lat: userLoc?.latitude ?? 52.3676,
    lng: userLoc?.longitude ?? 4.9041,
  };

  const [products, services, groups] = await Promise.all([
    listProducts({
      lat: center.lat,
      lng: center.lng,
      radiusKm: 80,
      limit: 40,
    }),
    listServices({
      lat: center.lat,
      lng: center.lng,
      radiusKm: 80,
      limit: 40,
    }),
    listGroups(),
  ]);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("map")} description={t("mapSubtitle")} />
      <MapExplorer
        center={center}
        products={products.items
          .filter((p) => p.latitude != null && p.longitude != null)
          .map((p) => ({
            id: p.publicId,
            title: p.title,
            lat: p.latitude!,
            lng: p.longitude!,
            href: `/products/${p.publicId}`,
            kind: "product" as const,
          }))}
        services={services.items
          .filter((s) => s.latitude != null && s.longitude != null)
          .map((s) => ({
            id: s.publicId,
            title: s.title,
            lat: s.latitude!,
            lng: s.longitude!,
            href: `/services/${s.publicId}`,
            kind: "service" as const,
          }))}
        groups={groups
          .filter((g) => g.latitude != null && g.longitude != null)
          .map((g) => ({
            id: g.slug,
            title: g.name,
            lat: g.latitude!,
            lng: g.longitude!,
            href: `/groups/${g.slug}`,
            kind: "group" as const,
          }))}
        labels={{
          products: t("products"),
          services: t("services"),
          groups: t("groups"),
          nearby: t("nearby"),
        }}
      />
    </div>
  );
}
