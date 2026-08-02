"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Heart, MessageCircle, Star } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  bookServiceAction,
  contactSellerAction,
  createOfferAction,
  toggleFavoriteAction,
} from "@/server/actions/marketplace-actions";

export function ServiceDetailClient({
  service,
  labels,
}: {
  service: {
    publicId: string;
    id: string;
    title: string;
    description: string;
    priceLabel: string | null;
    pricingType: string;
    availability: string | null;
    workingHours: string | null;
    city: string | null;
    ratingAvg: number;
    ratingCount: number;
    favorited: boolean;
    media: { id: string; type: string; url: string }[];
    provider: {
      id: string;
      name: string;
      username: string;
      avatarUrl?: string | null;
      verified: boolean;
    };
    isOwner: boolean;
    hasFixedPrice: boolean;
  };
  labels: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [favorited, setFavorited] = useState(service.favorited);
  const router = useRouter();
  const tCommon = useTranslations("common");

  return (
    <div className="grid gap-5 animate-in-up lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <div className="overflow-hidden rounded-2xl border bg-muted">
          {service.media[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={service.media[0].url}
              alt=""
              className="aspect-[16/10] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center text-muted-foreground">
              Service
            </div>
          )}
        </div>
        <Card>
          <CardContent className="space-y-3 p-5">
            <h1 className="text-2xl font-bold">{service.title}</h1>
            {service.priceLabel ? (
              <p className="text-xl font-bold text-brand-700">{service.priceLabel}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge>{service.pricingType}</Badge>
              {service.city ? <Badge variant="outline">{service.city}</Badge> : null}
              {service.ratingCount > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {service.ratingAvg.toFixed(1)} ({service.ratingCount})
                </span>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-sm">{service.description}</p>
            {service.availability ? (
              <p className="text-sm text-muted-foreground">{service.availability}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 lg:col-span-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <Link href={`/profile/${service.provider.username}`} className="flex items-center gap-3">
              <Avatar src={service.provider.avatarUrl} fallback={service.provider.name} size="lg" />
              <div>
                <p className="font-semibold">{service.provider.name}</p>
                {service.provider.verified ? (
                  <Badge variant="success" className="gap-1">
                    <BadgeCheck className="h-3 w-3" />
                    {labels.verified}
                  </Badge>
                ) : null}
              </div>
            </Link>

            {!service.isOwner ? (
              <>
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    fd.set("servicePublicId", service.publicId);
                    startTransition(async () => {
                      try {
                        const res = await bookServiceAction(fd);
                        router.push(`/orders/${res.orderPublicId}`);
                      } catch (err) {
                        toast({
                          title: err instanceof Error ? err.message : tCommon("error"),
                          variant: "danger",
                        });
                      }
                    });
                  }}
                >
                  {!service.hasFixedPrice ? (
                    <Input
                      name="amount"
                      type="number"
                      step="0.01"
                      label={labels.customAmount}
                      required
                    />
                  ) : null}
                  <Input name="notes" placeholder="..." />
                  <Button type="submit" fullWidth size="lg" loading={pending}>
                    {labels.book}
                  </Button>
                </form>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() =>
                    startTransition(async () => {
                      const res = await contactSellerAction(service.provider.id);
                      router.push(`/messages/${res.conversationId}`);
                    })
                  }
                >
                  <MessageCircle className="h-4 w-4" />
                  {labels.contact}
                </Button>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    fd.set("servicePublicId", service.publicId);
                    startTransition(async () => {
                      await createOfferAction(fd);
                      router.push("/deals");
                    });
                  }}
                  className="space-y-2"
                >
                  <Input name="amount" type="number" step="0.01" required />
                  <Button type="submit" variant="soft" fullWidth loading={pending}>
                    {labels.offer}
                  </Button>
                </form>
              </>
            ) : null}

            <Button
              variant="outline"
              fullWidth
              onClick={() =>
                startTransition(async () => {
                  const res = await toggleFavoriteAction("service", service.id);
                  setFavorited(res.favorited);
                })
              }
            >
              <Heart className={`h-4 w-4 ${favorited ? "fill-danger text-danger" : ""}`} />
              {labels.save}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
