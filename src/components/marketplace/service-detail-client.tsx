"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Heart, MapPin, MessageCircle, Star } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import {
  contactSellerAction,
  toggleFavoriteAction,
} from "@/server/actions/marketplace-actions";
import { TravelInfo } from "./travel-info";

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
    country: string | null;
    latitude: number | null;
    longitude: number | null;
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
    travel: {
      originLat: number;
      originLng: number;
      destLat: number;
      destLng: number;
      distanceKm: number;
    } | null;
  };
  labels: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [favorited, setFavorited] = useState(service.favorited);
  const router = useRouter();

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

        {(service.latitude != null && service.longitude != null) || service.city ? (
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-2 font-semibold">{labels.location}</h2>
              <p className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[service.city, service.country].filter(Boolean).join(", ")}
              </p>
              {service.travel ? (
                <TravelInfo
                  originLat={service.travel.originLat}
                  originLng={service.travel.originLng}
                  destLat={service.travel.destLat}
                  destLng={service.travel.destLng}
                  distanceKm={service.travel.distanceKm}
                  labels={{
                    travelTime: labels.travelTime,
                    directions: labels.directions,
                    viewOnMap: labels.viewOnMap,
                  }}
                />
              ) : null}
              {service.latitude != null && service.longitude != null ? (
                <iframe
                  title="map"
                  className="mt-3 h-56 w-full rounded-xl border border-border"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${service.longitude - 0.02}%2C${service.latitude - 0.02}%2C${service.longitude + 0.02}%2C${service.latitude + 0.02}&layer=mapnik&marker=${service.latitude}%2C${service.longitude}`}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}
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
              <Button
                fullWidth
                size="lg"
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const res = await contactSellerAction(service.provider.id);
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
