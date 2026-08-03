import "server-only";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
};

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
