"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Car, Clock, MapPin, Navigation } from "lucide-react";
import { getTravelInfoAction } from "@/server/actions/marketplace-actions";
import { Link } from "@/i18n/navigation";
import { estimateTravelTime } from "@/lib/geo";

type Props = {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  distanceKm: number;
  labels: {
    travelTime: string;
    directions: string;
    viewOnMap: string;
  };
};

export function TravelInfo({
  originLat,
  originLng,
  destLat,
  destLng,
  distanceKm,
  labels,
}: Props) {
  const t = useTranslations("marketplace");
  const [travelMinutes, setTravelMinutes] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const info = await getTravelInfoAction(originLat, originLng, destLat, destLng);
      if (active) setTravelMinutes(info?.durationMinutes ?? null);
    })();
    return () => {
      active = false;
    };
  }, [originLat, originLng, destLat, destLng]);

  const minutes = travelMinutes ?? estimateTravelTime(distanceKm);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
      <span className="inline-flex items-center gap-1.5 text-foreground/90">
        <MapPin className="h-4 w-4 text-brand-600" />
        {distanceKm.toFixed(1)} km
      </span>
      <span className="inline-flex items-center gap-1.5 text-foreground/90">
        <Clock className="h-4 w-4 text-brand-600" />
        ~{minutes} {t("minutesShort")}
      </span>
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Car className="h-4 w-4" />
        {labels.travelTime}
      </span>
      <span className="ms-auto flex items-center gap-2">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
        >
          <Navigation className="h-3.5 w-3.5" />
          {labels.directions}
        </a>
        <Link
          href={`/map?lat=${destLat}&lng=${destLng}&zoom=15`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
        >
          <MapPin className="h-3.5 w-3.5" />
          {labels.viewOnMap}
        </Link>
      </span>
    </div>
  );
}
