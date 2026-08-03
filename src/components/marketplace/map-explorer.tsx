"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Locate } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Pin = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  href: string;
  kind: "product" | "service" | "job" | "group";
  priceLabel?: string | null;
  imageUrl?: string | null;
  company?: string | null;
};

type Props = {
  center: { lat: number; lng: number };
  zoom?: number;
  pins: Pin[];
  labels: Record<string, string>;
};

const KIND_COLORS: Record<Pin["kind"], string> = {
  product: "#0d9488",
  service: "#f97316",
  job: "#3b82f6",
  group: "#8b5cf6",
};

export function MapExplorer({ center, zoom, pins, labels }: Props) {
  const [filter, setFilter] = useState<"all" | Pin["kind"]>("all");
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<{
    L: typeof import("leaflet");
    instance: import("leaflet").Map;
  } | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? pins : pins.filter((p) => p.kind === filter)),
    [pins, filter],
  );

  // Init map once
  useEffect(() => {
    if (!mapRef.current || map) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      if (cancelled || !mapRef.current) return;
      const instance = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom: zoom && Number.isFinite(zoom) ? zoom : 11,
        scrollWheelZoom: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(instance);
      setMap({ L, instance });
    })();
    return () => {
      cancelled = true;
    };
  }, [center, map, zoom]);

  // Re-center when the center prop changes after mount
  useEffect(() => {
    if (!map) return;
    map.instance.setView([center.lat, center.lng], zoom && Number.isFinite(zoom) ? zoom : undefined);
  }, [center, map, zoom]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast({ title: labels.locationError, variant: "warning" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        window.location.href = `/map?lat=${latitude.toFixed(5)}&lng=${longitude.toFixed(5)}&zoom=13`;
      },
      () => {
        setLocating(false);
        toast({ title: labels.locationError, variant: "warning" });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // Markers + clustering
  useEffect(() => {
    if (!map) return;
    const { L, instance } = map;
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 55,
      showCoverageOnHover: false,
    });

    for (const pin of visible) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:26px;height:26px;border-radius:9999px;background:${KIND_COLORS[pin.kind]};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:700">${
          pin.kind === "job" ? "J" : pin.kind === "product" ? "P" : pin.kind === "service" ? "S" : "G"
        }</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon });
      const popup = L.popup({ maxWidth: 260, offset: [0, -8] });
      const preview = document.createElement("div");
      preview.className = "khadamatak-marker-preview";
      preview.innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-start">
          ${
            pin.imageUrl
              ? `<img src="${pin.imageUrl}" alt="" style="width:52px;height:52px;border-radius:10px;object-fit:cover;flex-shrink:0" loading="lazy"/>`
              : `<div style="width:52px;height:52px;border-radius:10px;background:#f1f5f9;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:700;color:#64748b">${
                  (pin.company ?? pin.title).charAt(0).toUpperCase()
                }</div>`
          }
          <div style="min-width:0">
            <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${pin.title}</p>
            ${
              pin.priceLabel
                ? `<p style="margin:2px 0 0;font-size:12px;font-weight:700;color:#0d9488">${pin.priceLabel}</p>`
                : pin.company
                  ? `<p style="margin:2px 0 0;font-size:11px;color:#64748b">${pin.company}</p>`
                  : ""
            }
            <a href="${pin.href}" style="display:inline-flex;margin-top:6px;font-size:11px;font-weight:700;color:#0d9488;text-decoration:none">${labels.viewDetails} →</a>
          </div>
        </div>`;
      popup.setContent(preview);
      marker.bindPopup(popup);
      clusterGroup.addLayer(marker);
    }

    instance.addLayer(clusterGroup);
    if (visible.length > 1) {
      instance.fitBounds(clusterGroup.getBounds(), { padding: [24, 24], maxZoom: 14 });
    } else if (visible.length === 1) {
      instance.setView([visible[0].lat, visible[0].lng], 13);
    }

    return () => {
      instance.removeLayer(clusterGroup);
    };
  }, [map, visible, labels]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      map?.instance.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="overflow-hidden rounded-2xl border border-border">
          <div ref={mapRef} className="h-[440px] w-full" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["all", labels.nearby],
              ["product", labels.products],
              ["service", labels.services],
              ["job", labels.jobs],
              ["group", labels.groups],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className={cn(
              "ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300",
            )}
          >
            <Locate className="h-3.5 w-3.5" />
            {locating ? labels.locating : labels.useMyLocation}
          </button>
        </div>
      </div>
      <div className="max-h-[500px] space-y-2 overflow-y-auto lg:col-span-2">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          visible.map((p) => (
            <Link key={`${p.kind}-${p.id}`} href={p.href as "/"}>
              <Card className="mb-2 transition hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: KIND_COLORS[p.kind] }}
                  >
                    {p.kind === "job" ? "J" : p.kind === "product" ? "P" : p.kind === "service" ? "S" : "G"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {p.kind}
                    </p>
                    <p className="truncate font-semibold">{p.title}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
