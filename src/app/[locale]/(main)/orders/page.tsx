import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listUserOrders } from "@/server/marketplace/order-service";
import { PageHeader } from "@/components/shared/page-header";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/orders`);
  }
  const t = await getTranslations("marketplace");
  const orders = await listUserOrders(session.user.id);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("orders")} description={t("ordersSubtitle")} />
      <div className="space-y-2">
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
        ) : (
          orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.publicId}`}>
              <Card className="mb-2 transition hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">
                      {o.product?.title || o.service?.title || o.publicId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.buyerId === session.user!.id
                        ? `${t("seller")}: ${o.seller.profile?.displayName}`
                        : `${t("buyer")}: ${o.buyer.profile?.displayName}`}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold">
                      {formatMoney(
                        o.amountCents,
                        o.currency,
                        locale === "ar" ? "ar" : "nl-NL",
                      )}
                    </p>
                    <Badge>{o.status}</Badge>
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
