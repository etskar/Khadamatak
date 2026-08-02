import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listUserDeals, listUserOffers } from "@/server/marketplace/deal-service";
import { PageHeader } from "@/components/shared/page-header";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { OffersClient } from "@/components/marketplace/offers-client";

export default async function DealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/deals`);
  }
  const t = await getTranslations("marketplace");
  const [deals, offers] = await Promise.all([
    listUserDeals(session.user.id),
    listUserOffers(session.user.id),
  ]);

  return (
    <div className="space-y-6 animate-in-up">
      <PageHeader title={t("deals")} description={t("dealsSubtitle")} />

      <OffersClient
        userId={session.user.id}
        offers={offers.map((o) => ({
          publicId: o.publicId,
          amountLabel: formatMoney(
            o.amountCents,
            o.currency,
            locale === "ar" ? "ar" : "nl-NL",
          ),
          status: o.status,
          message: o.message,
          isSeller: o.sellerId === session.user!.id,
          counterparty:
            o.sellerId === session.user!.id
              ? o.buyer.profile?.displayName ?? "User"
              : o.seller.profile?.displayName ?? "User",
          title: o.product?.title || o.service?.title || "Offer",
        }))}
        labels={{
          offers: t("offers"),
          accept: t("accept"),
          reject: t("reject"),
        }}
      />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t("deals")}</h2>
        {deals.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noDeals")}</p>
        ) : (
          deals.map((d) => (
            <Link key={d.id} href={`/deals/${d.publicId}`}>
              <Card className="mb-2 transition hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">
                      {d.product?.title || d.service?.title || d.publicId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.buyer.profile?.displayName} ↔ {d.seller.profile?.displayName}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold">
                      {formatMoney(
                        d.amountCents,
                        d.currency,
                        locale === "ar" ? "ar" : "nl-NL",
                      )}
                    </p>
                    <Badge>{d.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
