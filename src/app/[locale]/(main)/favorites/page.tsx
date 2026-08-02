import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listFavorites } from "@/server/marketplace/favorite-service";
import { PageHeader } from "@/components/shared/page-header";
import { ListingCard, priceCentsLabel } from "@/components/marketplace/listing-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/favorites`);
  }
  const t = await getTranslations("marketplace");
  const items = await listFavorites(session.user.id);

  const products = items.filter((i) => i.product);
  const services = items.filter((i) => i.service);
  const groups = items.filter((i) => i.group);

  return (
    <div className="space-y-6 animate-in-up">
      <PageHeader title={t("favorites")} />
      {items.length === 0 ? (
        <EmptyState icon={Heart} title={t("noFavorites")} description={t("noFavoritesDesc")} />
      ) : (
        <>
          {products.length > 0 ? (
            <div>
              <h2 className="mb-2 font-semibold">{t("products")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {products.map((i) => (
                  <ListingCard
                    key={i.id}
                    href={`/products/${i.product!.publicId}`}
                    title={i.product!.title}
                    priceLabel={priceCentsLabel(
                      i.product!.priceCents,
                      i.product!.currency,
                      locale === "ar" ? "ar" : "nl-NL",
                    )}
                    imageUrl={i.product!.media[0]?.url}
                    city={i.product!.city}
                    verified={
                      i.product!.seller.verification?.status === "verified"
                    }
                    noImageLabel={t("noImage")}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {services.length > 0 ? (
            <div>
              <h2 className="mb-2 font-semibold">{t("services")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {services.map((i) => (
                  <ListingCard
                    key={i.id}
                    href={`/services/${i.service!.publicId}`}
                    title={i.service!.title}
                    priceLabel={priceCentsLabel(
                      i.service!.priceCents,
                      i.service!.currency,
                      locale === "ar" ? "ar" : "nl-NL",
                      i.service!.pricingType,
                    )}
                    imageUrl={i.service!.media[0]?.url}
                    city={i.service!.city}
                    noImageLabel={t("noImage")}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {groups.length > 0 ? (
            <div className="space-y-2">
              <h2 className="font-semibold">{t("groups")}</h2>
              {groups.map((i) => (
                <Link key={i.id} href={`/groups/${i.group!.slug}`}>
                  <Card>
                    <CardContent className="p-4 font-semibold">
                      {i.group!.name}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
