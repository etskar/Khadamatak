import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRequestByPublicId } from "@/server/marketplace/request-service";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { formatMoney } from "@/lib/money";
import { ContactAndDealButtons } from "@/components/marketplace/contact-deal-buttons";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const session = await auth();
  const req = await getRequestByPublicId(publicId);
  if (!req) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-in-up">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <Avatar
              src={req.owner.profile?.avatarUrl}
              fallback={req.owner.profile?.displayName ?? "U"}
            />
            <div>
              <p className="font-semibold">{req.owner.profile?.displayName}</p>
              <p className="text-xs text-muted-foreground">@{req.owner.profile?.username}</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{req.title}</h1>
          <p className="whitespace-pre-wrap text-sm">{req.description}</p>
          <p className="text-sm text-muted-foreground">
            {[req.startLocation, req.destination].filter(Boolean).join(" → ")}
          </p>
          {req.budgetCents != null ? (
            <p className="text-lg font-bold text-brand-700">
              {formatMoney(req.budgetCents, req.currency, locale === "ar" ? "ar" : "nl-NL")}
            </p>
          ) : null}
          {session?.user?.id && session.user.id !== req.ownerId ? (
            <ContactAndDealButtons
              sellerId={req.ownerId}
              requestPublicId={req.publicId}
              defaultAmount={
                req.budgetCents != null ? (req.budgetCents / 100).toFixed(2) : ""
              }
              labels={{
                contact: t("contact"),
                startDeal: t("startDeal"),
                termsPlaceholder: t("termsPlaceholder"),
              }}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
