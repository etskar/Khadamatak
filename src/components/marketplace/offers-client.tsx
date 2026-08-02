"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { respondOfferAction } from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";

export function OffersClient({
  offers,
  labels,
}: {
  userId: string;
  offers: {
    publicId: string;
    amountLabel: string;
    status: string;
    message: string | null;
    isSeller: boolean;
    counterparty: string;
    title: string;
  }[];
  labels: { offers: string; accept: string; reject: string };
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const tCommon = useTranslations("common");
  const pendingOffers = offers.filter((o) => o.status === "pending");

  if (pendingOffers.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{labels.offers}</h2>
      {pendingOffers.map((o) => (
        <Card key={o.publicId}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{o.title}</p>
              <p className="text-xs text-muted-foreground">
                {o.counterparty} · {o.amountLabel}
              </p>
              {o.message ? (
                <p className="text-sm text-muted-foreground">{o.message}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Badge>{o.status}</Badge>
              {o.isSeller ? (
                <>
                  <Button
                    size="sm"
                    loading={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await respondOfferAction(o.publicId, true);
                        toast({ title: tCommon("success"), variant: "success" });
                        if (res.dealPublicId) {
                          router.push(`/deals/${res.dealPublicId}`);
                        } else {
                          router.refresh();
                        }
                      })
                    }
                  >
                    {labels.accept}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await respondOfferAction(o.publicId, false);
                        router.refresh();
                      })
                    }
                  >
                    {labels.reject}
                  </Button>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
