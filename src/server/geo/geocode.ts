import "server-only";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
};

export type TravelInfo = {
  distanceKm: number;
  durationMinutes: number;
};

/**
 * Estimates driving distance and travel time between two coordinates using
 * the free OSRM public routing API (no API key). Returns null when routing is
 * unavailable so callers can fall back to a straight-line estimate.
 */
export async function getTravelInfo(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<TravelInfo | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false&alternatives=false`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code?: string;
      routes?: { distance?: number; duration?: number }[];
    };
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route?.distance || !route?.duration) return null;
    return {
      distanceKm: route.distance / 1000,
      durationMinutes: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

/**
 * Address autocomplete backed by OpenStreetMap Nominatim (free, no API key).
 * Server-side only: keeps the client free of third-party calls and lets us
 * enforce a sane rate limit via the app's own edge.
 */
export async function geocodeAddress(query: string, countryCodes?: string[]): Promise<
  { label: string; latitude: number; longitude: number }[]
> {
  const q = query.trim();
  if (q.length < 4) return [];

  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    limit: "6",
    addressdetails: "0",
    "accept-language": "en",
  });
  if (countryCodes?.length) params.set("countrycodes", countryCodes.join(","));

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      "User-Agent": "Khadamatak/1.0 (marketplace address autocomplete)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = (await res.json()) as NominatimResult[];
  return data.map((r) => ({
    label: r.display_name,
    latitude: Number(r.lat),
    longitude: Number(r.lon),
  }));
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<{
  city: string | null;
  country: string | null;
} | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    zoom: "10",
    "accept-language": "en",
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: {
      "User-Agent": "Khadamatak/1.0 (marketplace reverse geocoding)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { address?: { city?: string; town?: string; village?: string; country_code?: string } };
  if (!data.address) return null;
  return {
    city: data.address.city ?? data.address.town ?? data.address.village ?? null,
    country: data.address.country_code?.toUpperCase() ?? null,
  };
}
