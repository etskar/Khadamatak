import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listProducts } from "@/server/marketplace/product-service";
import { PageHeader } from "@/components/shared/page-header";
import { ListingCard, priceCentsLabel } from "@/components/marketplace/listing-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Package, PlusCircle } from "lucide-react";
import { PrimaryAction } from "@/components/ui/primary-action";
import { FiltersDrawer } from "@/components/marketplace/filters-drawer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketplace" });
  return { title: t("products") };
}

export default async function ProductsPage({
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
    where: { kind: { in: ["product", "both"] } },
    orderBy: { sortOrder: "asc" },
  });

  const userLoc = session?.user?.id
    ? await db.userLocation.findUnique({ where: { userId: session.user.id } })
    : null;

  const feed = await listProducts({
    q: sp.q,
    categoryId: sp.category,
    city: sp.city,
    minPrice: sp.min ? Math.round(Number(sp.min) * 100) : undefined,
    maxPrice: sp.max ? Math.round(Number(sp.max) * 100) : undefined,
    verifiedOnly: sp.verified === "1",
    lat: sp.lat ? Number(sp.lat) : userLoc?.latitude ?? undefined,
    lng: sp.lng ? Number(sp.lng) : userLoc?.longitude ?? undefined,
    radiusKm: sp.radius ? Number(sp.radius) : undefined,
  });

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("products")}
        description={t("productsSubtitle")}
        actions={
          <PrimaryAction href="/sell/product" icon={PlusCircle} label={t("sellProduct")} />
        }
      />

      <FiltersDrawer
        basePath="/products"
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
        <EmptyState
          icon={Package}
          title={t("noProducts")}
          description={t("noProductsDesc")}
        />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {feed.items.map((p) => (
            <ListingCard
              key={p.id}
              href={`/products/${p.publicId}`}
              title={p.title}
              priceLabel={priceCentsLabel(
                p.priceCents,
                p.currency,
                locale === "ar" ? "ar" : "nl-NL",
              )}
              imageUrl={p.media[0]?.url}
              noImageLabel={t("noImage")}
              city={p.city}
              verified={p.seller.verification?.status === "verified"}
              favoritesCount={p.favoritesCount}
              distanceLabel={
                p.distanceKm != null ? `${p.distanceKm.toFixed(1)} km` : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
