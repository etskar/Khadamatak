import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listProducts } from "@/server/marketplace/product-service";
import { listServices } from "@/server/marketplace/service-service";
import { listJobs } from "@/server/marketplace/job-service";
import { listGroups } from "@/server/marketplace/group-service";
import { PageHeader } from "@/components/shared/page-header";
import { MapExplorer } from "@/components/marketplace/map-explorer";
import { priceCentsLabel } from "@/components/marketplace/listing-card";
import { salaryLabel } from "@/components/marketplace/job-card";

export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const session = await auth();
  const userLoc = session?.user?.id
    ? await db.userLocation.findUnique({ where: { userId: session.user.id } })
    : null;

  const latParam = sp.lat ? Number(sp.lat) : null;
  const lngParam = sp.lng ? Number(sp.lng) : null;
  const center = {
    lat: Number.isFinite(latParam) ? latParam! : (userLoc?.latitude ?? 52.3676),
    lng: Number.isFinite(lngParam) ? lngParam! : (userLoc?.longitude ?? 4.9041),
  };
  const zoom = sp.zoom ? Number(sp.zoom) : undefined;

  const [products, services, jobs, groups] = await Promise.all([
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
    listJobs({
      lat: center.lat,
      lng: center.lng,
      radiusKm: 80,
      limit: 40,
    }),
    listGroups(),
  ]);

  const pins = [
    ...products.items
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
        id: p.publicId,
        title: p.title,
        lat: p.latitude!,
        lng: p.longitude!,
        href: `/products/${p.publicId}`,
        kind: "product" as const,
        priceLabel: priceCentsLabel(p.priceCents, p.currency, "en"),
        imageUrl: p.media[0]?.url ?? null,
      })),
    ...services.items
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        id: s.publicId,
        title: s.title,
        lat: s.latitude!,
        lng: s.longitude!,
        href: `/services/${s.publicId}`,
        kind: "service" as const,
        priceLabel: priceCentsLabel(
          s.priceCents,
          s.currency,
          "en",
          s.pricingType,
        ),
        imageUrl: s.media[0]?.url ?? null,
      })),
    ...jobs.items
      .filter((j) => j.latitude != null && j.longitude != null)
      .map((j) => ({
        id: j.publicId,
        title: j.title,
        lat: j.latitude!,
        lng: j.longitude!,
        href: `/jobs/${j.publicId}`,
        kind: "job" as const,
        company: j.company,
        priceLabel: salaryLabel(
          j.salaryMinCents,
          j.salaryMaxCents,
          j.currency,
          "en",
          j.salaryPeriod,
        ),
        imageUrl: j.media[0]?.url ?? null,
      })),
    ...groups
      .filter((g) => g.latitude != null && g.longitude != null)
      .map((g) => ({
        id: g.slug,
        title: g.name,
        lat: g.latitude!,
        lng: g.longitude!,
        href: `/groups/${g.slug}`,
        kind: "group" as const,
      })),
  ];

  return (
    <div className="animate-in-up">
      <PageHeader title={t("map")} description={t("mapSubtitle")} />
      <MapExplorer
        center={center}
        zoom={zoom}
        pins={pins}
        labels={{
          products: t("products"),
          services: t("services"),
          jobs: t("jobs"),
          groups: t("groups"),
          nearby: t("nearby"),
          viewDetails: t("viewDetails"),
          useMyLocation: t("useMyLocation"),
          locating: t("locating"),
          locationError: t("locationError"),
        }}
      />
    </div>
  );
}
