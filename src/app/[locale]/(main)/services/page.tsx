import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listServices } from "@/server/marketplace/service-service";
import { PageHeader } from "@/components/shared/page-header";
import { ListingCard, priceCentsLabel } from "@/components/marketplace/listing-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Briefcase, PlusCircle } from "lucide-react";
import { PrimaryAction } from "@/components/ui/primary-action";
import { FiltersDrawer } from "@/components/marketplace/filters-drawer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketplace" });
  return { title: t("services") };
}

export default async function ServicesPage({
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

  const categories = await db.category.findMany({
    where: { kind: { in: ["service", "both"] } },
    orderBy: { sortOrder: "asc" },
  });

  const userLoc = session?.user?.id
    ? await db.userLocation.findUnique({ where: { userId: session.user.id } })
    : null;

  const feed = await listServices({
    q: sp.q,
    categoryId: sp.category,
    city: sp.city,
    minPrice: sp.min ? Math.round(Number(sp.min) * 100) : undefined,
    maxPrice: sp.max ? Math.round(Number(sp.max) * 100) : undefined,
    verifiedOnly: sp.verified === "1",
    lat: userLoc?.latitude ?? undefined,
    lng: userLoc?.longitude ?? undefined,
    radiusKm: sp.radius ? Number(sp.radius) : undefined,
  });

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("services")}
        description={t("servicesSubtitle")}
        actions={
          <PrimaryAction href="/sell/service" icon={PlusCircle} label={t("offerService")} />
        }
      />
      <FiltersDrawer
        basePath="/services"
        categories={categories.map((c) => ({
          id: c.id,
          label: locale === "ar" ? c.nameAr : c.nameNl,
        }))}
        initial={{
          q: sp.q ?? "",
          category: sp.category ?? "",
          city: sp.city ?? "",
          min: sp.min ?? "",
          max: sp.max ?? "",
          verified: sp.verified === "1",
        }}
      />
      {feed.items.length === 0 ? (
        <EmptyState icon={Briefcase} title={t("noServices")} description={t("noServicesDesc")} />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {feed.items.map((s) => (
            <ListingCard
              key={s.id}
              href={`/services/${s.publicId}`}
              title={s.title}
              priceLabel={priceCentsLabel(
                s.priceCents,
                s.currency,
                locale === "ar" ? "ar" : "nl-NL",
                s.pricingType,
              )}
              imageUrl={s.media[0]?.url}
              noImageLabel={t("noImage")}
              city={s.city}
              verified={s.provider.verification?.status === "verified"}
              rating={s.ratingAvg}
              favoritesCount={s.favoritesCount}
              badge={s.pricingType}
              distanceLabel={
                s.distanceKm != null ? `${s.distanceKm.toFixed(1)} km` : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
