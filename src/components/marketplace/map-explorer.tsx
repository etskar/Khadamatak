"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Pin = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  href: string;
  kind: "product" | "service" | "group";
};

export function MapExplorer({
  center,
  products,
  services,
  groups,
  labels,
}: {
  center: { lat: number; lng: number };
  products: Pin[];
  services: Pin[];
  groups: Pin[];
  labels: Record<string, string>;
}) {
  const [filter, setFilter] = useState<"all" | "product" | "service" | "group">(
    "all",
  );

  const pins = useMemo(() => {
    const all = [...products, ...services, ...groups];
    return filter === "all" ? all : all.filter((p) => p.kind === filter);
  }, [products, services, groups, filter]);

  const bbox = useMemo(() => {
    if (pins.length === 0) {
      return {
        minLng: center.lng - 0.08,
        minLat: center.lat - 0.05,
        maxLng: center.lng + 0.08,
        maxLat: center.lat + 0.05,
      };
    }
    const lats = pins.map((p) => p.lat);
    const lngs = pins.map((p) => p.lng);
    return {
      minLng: Math.min(...lngs) - 0.02,
      minLat: Math.min(...lats) - 0.02,
      maxLng: Math.max(...lngs) + 0.02,
      maxLat: Math.max(...lats) + 0.02,
    };
  }, [pins, center]);

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.minLng}%2C${bbox.minLat}%2C${bbox.maxLng}%2C${bbox.maxLat}&layer=mapnik&marker=${center.lat}%2C${center.lng}`;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <iframe
          title="map"
          className="h-[420px] w-full rounded-2xl border border-border"
          src={src}
          loading="lazy"
        />
        <div className="mt-3 flex gap-2">
          {(
            [
              ["all", labels.nearby],
              ["product", labels.products],
              ["service", labels.services],
              ["group", labels.groups],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[480px] space-y-2 overflow-y-auto lg:col-span-2">
        {pins.map((p) => (
          <Link key={`${p.kind}-${p.id}`} href={p.href as "/"}>
            <Card className="mb-2 transition hover:shadow-md">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase text-muted-foreground">
                  {p.kind}
                </p>
                <p className="font-semibold">{p.title}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
