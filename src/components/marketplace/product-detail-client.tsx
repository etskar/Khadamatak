"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  BadgeCheck,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  Star,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  buyProductAction,
  contactSellerAction,
  createOfferAction,
  reportListingAction,
  toggleFavoriteAction,
} from "@/server/actions/marketplace-actions";

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
    reviews: {
      id: string;
      rating: number;
      content: string | null;
      author: string;
      createdAt: string;
    }[];
    distanceLabel: string | null;
    isOwner: boolean;
    publishedAt: string;
  };
  labels: Record<string, string>;
};

export function ProductDetailClient({ product, labels }: Props) {
  const [active, setActive] = useState(0);
  const [favorited, setFavorited] = useState(product.favorited);
  const [offerOpen, setOfferOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const tCommon = useTranslations("common");
  const media = product.media;

  return (
    <div className="grid gap-5 animate-in-up lg:grid-cols-5">
      <div className="space-y-3 lg:col-span-3">
        <div className="overflow-hidden rounded-2xl border border-border bg-muted">
          {media[active] ? (
            media[active].type === "video" ? (
              <video
                src={media[active].url}
                controls
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media[active].url}
                alt=""
                className="aspect-[4/3] w-full object-cover"
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
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${
                  i === active ? "border-brand-600" : "border-border"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="h-full w-full object-cover" />
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
              {product.latitude != null && product.longitude != null ? (
                <iframe
                  title="map"
                  className="h-56 w-full rounded-xl border border-border"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${product.longitude - 0.02}%2C${product.latitude - 0.02}%2C${product.longitude + 0.02}%2C${product.latitude + 0.02}&layer=mapnik&marker=${product.latitude}%2C${product.longitude}`}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-semibold">{labels.reviews}</h2>
            {product.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              product.reviews.map((r) => (
                <div key={r.id} className="border-b border-border/60 pb-3 last:border-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {r.author}
                    <span className="inline-flex items-center gap-0.5 text-warning">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {r.rating}
                    </span>
                  </div>
                  {r.content ? (
                    <p className="mt-1 text-sm text-muted-foreground">{r.content}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
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
              <>
                <Button
                  fullWidth
                  size="lg"
                  loading={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        const res = await buyProductAction(product.publicId);
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
                  {labels.buyNow}
                </Button>
                <Button
                  fullWidth
                  variant="outline"
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
                <Button fullWidth variant="soft" onClick={() => setOfferOpen((v) => !v)}>
                  {labels.offer}
                </Button>
                {offerOpen ? (
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      fd.set("productPublicId", product.publicId);
                      startTransition(async () => {
                        try {
                          await createOfferAction(fd);
                          toast({ title: tCommon("success"), variant: "success" });
                          setOfferOpen(false);
                          router.push("/deals");
                        } catch (err) {
                          toast({
                            title: err instanceof Error ? err.message : tCommon("error"),
                            variant: "danger",
                          });
                        }
                      });
                    }}
                  >
                    <Input name="amount" type="number" step="0.01" placeholder="€" required />
                    <Input name="message" placeholder="..." />
                    <Button type="submit" loading={pending} fullWidth>
                      {labels.offer}
                    </Button>
                  </form>
                ) : null}
              </>
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
