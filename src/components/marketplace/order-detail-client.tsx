"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmOrderAction,
  createReviewAction,
  markOrderDeliveredAction,
} from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";

export function OrderDetailClient({
  order,
  labels,
}: {
  order: {
    publicId: string;
    status: string;
    paymentStatus: string;
    deliveryStatus: string;
    amountLabel: string;
    feeLabel: string;
    sellerAmountLabel: string;
    title: string;
    isBuyer: boolean;
    isSeller: boolean;
    canReview: boolean;
    hasReview: boolean;
    invoiceNumber: string | null;
    escrowPublicId: string | null;
    events: { id: string; type: string; message: string | null; createdAt: string }[];
  };
  labels: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(5);
  const router = useRouter();
  const tCommon = useTranslations("common");

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-in-up">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>{order.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{order.publicId}</p>
          </div>
          <Badge>{order.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-2xl font-bold">{order.amountLabel}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">{labels.platformFee}</p>
              <p className="font-semibold">{order.feeLabel}</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">{labels.sellerReceives}</p>
              <p className="font-semibold">{order.sellerAmountLabel}</p>
            </div>
          </div>
          {order.invoiceNumber ? (
            <p className="text-sm">
              {labels.invoice}: <strong>{order.invoiceNumber}</strong>
            </p>
          ) : null}
          {order.escrowPublicId ? (
            <Link
              href={`/wallet/escrow/${order.escrowPublicId}`}
              className="text-sm font-semibold text-brand-700"
            >
              {labels.escrow} {order.escrowPublicId}
            </Link>          ) : null}

          <div className="flex flex-wrap gap-2">
            {order.isSeller &&
            ["payment_secured", "processing"].includes(order.status) ? (
              <Button
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    await markOrderDeliveredAction(order.publicId);
                    toast({ title: tCommon("success"), variant: "success" });
                    router.refresh();
                  })
                }
              >
                {labels.markDelivered}
              </Button>
            ) : null}
            {order.isBuyer &&
            ["payment_secured", "processing", "delivered"].includes(order.status) ? (
              <Button
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    await confirmOrderAction(order.publicId);
                    toast({ title: tCommon("success"), variant: "success" });
                    router.refresh();
                  })
                }
              >
                {labels.confirm}
              </Button>
            ) : null}
          </div>

          {order.canReview ? (
            <form
              className="space-y-2 rounded-xl border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("orderPublicId", order.publicId);
                fd.set("rating", String(rating));
                startTransition(async () => {
                  await createReviewAction(fd);
                  toast({ title: tCommon("success"), variant: "success" });
                  router.refresh();
                });
              }}
            >
              <p className="text-sm font-semibold">{labels.review}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`h-9 w-9 rounded-lg border text-sm font-bold ${
                      n <= rating ? "bg-warning/20 border-warning" : ""
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <Textarea name="content" />
              <Button type="submit" loading={pending}>
                {labels.review}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.timeline}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.events.map((e) => (
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
