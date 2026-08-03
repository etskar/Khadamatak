"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  BadgeCheck,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import {
  contactSellerAction,
  reportListingAction,
  toggleFavoriteAction,
} from "@/server/actions/marketplace-actions";
import { TravelInfo } from "./travel-info";

type Props = {
  product: {
    publicId: string;
    id: string;
    title: string;
    description: string;
    priceLabel: string;
    condition: string;
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    viewsCount: number;
    favoritesCount: number;
    favorited: boolean;
    media: { id: string; type: string; url: string }[];
    seller: {
      id: string;
      name: string;
      username: string;
      avatarUrl?: string | null;
      verified: boolean;
    };
    category: string | null;
    distanceLabel: string | null;
    isOwner: boolean;
    publishedAt: string;
    travel: {
      originLat: number;
      originLng: number;
      destLat: number;
      destLng: number;
      distanceKm: number;
    } | null;
  };
  labels: Record<string, string>;
};

export function ProductDetailClient({ product, labels }: Props) {
  const [active, setActive] = useState(0);
  const [favorited, setFavorited] = useState(product.favorited);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const tCommon = useTranslations("common");
  const media = product.media;

  return (
    <div className="grid gap-5 animate-in-up lg:grid-cols-5">
      <div className="space-y-3 lg:col-span-3">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
          {media[active] ? (
            media[active].type === "video" ? (
              <video
                src={media[active].url}
                controls
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <Image
                src={media[active].url}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="aspect-[4/3] object-cover"
                priority
              />
            )
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">
              {labels.noMedia}
            </div>
          )}
        </div>
        {media.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActive(i)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${
                  i === active ? "border-brand-600" : "border-border"
                }`}
              >
                <Image src={m.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <Card>
          <CardContent className="space-y-3 p-5">
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">
              {product.priceLabel}
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {product.category ? <Badge variant="secondary">{product.category}</Badge> : null}
              <Badge variant="outline">
                {labels.condition}: {product.condition}
              </Badge>
              <span>
                {labels.views}: {product.viewsCount}
              </span>
              {product.distanceLabel ? <span>{product.distanceLabel}</span> : null}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {product.description}
            </p>
          </CardContent>
        </Card>

        {(product.latitude != null && product.longitude != null) || product.city ? (
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-2 font-semibold">{labels.location}</h2>
              <p className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[product.city, product.country].filter(Boolean).join(", ")}
                {product.distanceLabel ? ` · ${product.distanceLabel}` : ""}
              </p>
              {product.travel ? (
                <TravelInfo
                  originLat={product.travel.originLat}
                  originLng={product.travel.originLng}
                  destLat={product.travel.destLat}
                  destLng={product.travel.destLng}
                  distanceKm={product.travel.distanceKm}
                  labels={{
                    travelTime: labels.travelTime,
                    directions: labels.directions,
                    viewOnMap: labels.viewOnMap,
                  }}
                />
              ) : null}
              {product.latitude != null && product.longitude != null ? (
                <iframe
                  title="map"
                  className="mt-3 h-56 w-full rounded-xl border border-border"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${product.longitude - 0.02}%2C${product.latitude - 0.02}%2C${product.longitude + 0.02}%2C${product.latitude + 0.02}&layer=mapnik&marker=${product.latitude}%2C${product.longitude}`}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-3 lg:col-span-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <Link
              href={`/profile/${product.seller.username}`}
              className="flex items-center gap-3"
            >
              <Avatar
                src={product.seller.avatarUrl}
                fallback={product.seller.name}
                size="lg"
              />
              <div>
                <p className="font-semibold">{product.seller.name}</p>
                {product.seller.verified ? (
                  <Badge variant="success" className="gap-1">
                    <BadgeCheck className="h-3 w-3" />
                    {labels.verified}
                  </Badge>
                ) : null}
              </div>
            </Link>

            {!product.isOwner ? (
              <Button
                fullWidth
                size="lg"
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const res = await contactSellerAction(product.seller.id);
                      router.push(`/messages/${res.conversationId}`);
                    } catch {
                      toast({ title: labels.loginRequired, variant: "warning" });
                    }
                  })
                }
              >
                <MessageCircle className="h-4 w-4" />
                {labels.contact}
              </Button>
            ) : (
              <Link
                href="/sell"
                className="flex h-11 items-center justify-center rounded-xl border border-border text-sm font-semibold"
              >
                Dashboard
              </Link>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const res = await toggleFavoriteAction("product", product.id);
                      setFavorited(res.favorited);
                    } catch {
                      toast({ title: labels.loginRequired, variant: "warning" });
                    }
                  })
                }
              >
                <Heart className={`h-4 w-4 ${favorited ? "fill-danger text-danger" : ""}`} />
                {labels.save}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(window.location.href);
                  toast({ title: tCommon("success"), variant: "success" });
                }}
              >
                <Share2 className="h-4 w-4" />
                {labels.share}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await reportListingAction("product", product.id, "spam");
                      toast({ title: tCommon("success"), variant: "success" });
                    } catch {
                      toast({ title: labels.loginRequired, variant: "warning" });
                    }
                  })
                }
              >
                <Flag className="h-4 w-4" />
                {labels.report}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
