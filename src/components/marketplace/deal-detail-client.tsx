"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  acceptDealAction,
  payDealAction,
  rejectDealAction,
} from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";

export function DealDetailClient({
  deal,
  labels,
}: {
  deal: {
    publicId: string;
    status: string;
    paymentStatus: string;
    amountLabel: string;
    terms: string | null;
    isBuyer: boolean;
    isSeller: boolean;
    title: string;
    buyerName: string;
    sellerName: string;
    orderPublicId: string | null;
    escrowPublicId: string | null;
    events: { id: string; type: string; message: string | null; createdAt: string }[];
  };
  labels: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const tCommon = useTranslations("common");

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-in-up">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>{deal.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {deal.buyerName} → {deal.sellerName}
            </p>
          </div>
          <Badge>{deal.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-2xl font-bold">{deal.amountLabel}</p>
          {deal.terms ? <p className="text-sm">{deal.terms}</p> : null}
          <div className="flex flex-wrap gap-2">
            {deal.isSeller && deal.status === "proposed" ? (
              <>
                <Button
                  loading={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await acceptDealAction(deal.publicId);
                      router.refresh();
                    })
                  }
                >
                  {labels.accept}
                </Button>
                <Button
                  variant="outline"
                  loading={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await rejectDealAction(deal.publicId);
                      router.refresh();
                    })
                  }
                >
                  {labels.reject}
                </Button>
              </>
            ) : null}
            {deal.isBuyer &&
            ["accepted", "proposed"].includes(deal.status) &&
            deal.paymentStatus !== "secured" ? (
              <Button
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const res = await payDealAction(deal.publicId);
                      toast({ title: tCommon("success"), variant: "success" });
                      router.push(`/orders/${res.orderPublicId}`);
                    } catch (e) {
                      toast({
                        title: e instanceof Error ? e.message : tCommon("error"),
                        variant: "danger",
                      });
                    }
                  })
                }
              >
                {labels.payEscrow}
              </Button>
            ) : null}
            {deal.orderPublicId ? (
              <Link
                href={`/orders/${deal.orderPublicId}`}
                className="inline-flex h-11 items-center rounded-xl border px-4 text-sm font-semibold"
              >
                {labels.openOrder}
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.timeline}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {deal.events.map((e) => (
            <div key={e.id} className="border-s-2 border-brand-500 ps-3">
              <p className="text-sm font-semibold">{e.type}</p>
              <p className="text-xs text-muted-foreground">{e.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
