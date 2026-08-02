"use client";

import { useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { setListingStatusAction } from "@/server/actions/marketplace-actions";

export function SellerListingsClient({
  products,
  services,
  labels,
}: {
  products: {
    publicId: string;
    title: string;
    status: string;
    views: number;
    favorites: number;
    orders: number;
  }[];
  services: {
    publicId: string;
    title: string;
    status: string;
    views: number;
    favorites: number;
    orders: number;
  }[];
  labels: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const Row = ({
    kind,
    item,
  }: {
    kind: "product" | "service";
    item: (typeof products)[0];
  }) => (
    <Card className="mb-2">
      <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div>
          <Link
            href={kind === "product" ? `/products/${item.publicId}` : `/services/${item.publicId}`}
            className="font-semibold hover:underline"
          >
            {item.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            {item.views} views · {item.favorites} fav · {item.orders} orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{item.status}</Badge>
          {item.status === "active" ? (
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  await setListingStatusAction(kind, item.publicId, "paused");
                  router.refresh();
                })
              }
            >
              {labels.pause}
            </Button>
          ) : item.status !== "deleted" ? (
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  await setListingStatusAction(kind, item.publicId, "active");
                  router.refresh();
                })
              }
            >
              {labels.activate}
            </Button>
          ) : null}
          {item.status !== "deleted" ? (
            <Button
              size="sm"
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  await setListingStatusAction(kind, item.publicId, "deleted");
                  router.refresh();
                })
              }
            >
              {labels.delete}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-2 font-semibold">{labels.products}</h2>
        {products.map((p) => (
          <Row key={p.publicId} kind="product" item={p} />
        ))}
      </div>
      <div>
        <h2 className="mb-2 font-semibold">{labels.services}</h2>
        {services.map((s) => (
          <Row key={s.publicId} kind="service" item={s} />
        ))}
      </div>
    </div>
  );
}
