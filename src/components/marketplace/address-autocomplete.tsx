"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { geocodeAddressAction } from "@/server/actions/marketplace-actions";

type Suggestion = { label: string; latitude: number; longitude: number };

type Props = {
  label?: string;
  placeholder?: string;
  countryCode?: string;
  value: string;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (lat: number | null, lng: number | null) => void;
};

export function AddressAutocomplete({
  label,
  placeholder,
  countryCode,
  value,
  onAddressChange,
  onCoordinatesChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleChange(next: string) {
    onAddressChange(next);
    onCoordinatesChange(null, null);
    if (timer.current) clearTimeout(timer.current);
    if (next.trim().length < 4) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await geocodeAddressAction(
          next,
          countryCode ? [countryCode] : undefined,
        );
        setSuggestions(res);
        setOpen(res.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 450);
  }

  function pick(s: Suggestion) {
    onAddressChange(s.label);
    onCoordinatesChange(s.latitude, s.longitude);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-12 w-full rounded-xl border border-input bg-card ps-9 pe-3 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
        {loading ? (
          <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {open && suggestions.length > 0 ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="max-h-60 overflow-y-auto p-1">
            {suggestions.map((s, i) => (
              <button
                key={`${s.latitude}-${s.longitude}-${i}`}
                type="button"
                onClick={() => pick(s)}
                className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <input type="hidden" name="addressLine" value={value} />
    </div>
  );
}
