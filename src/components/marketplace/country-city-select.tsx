"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { COUNTRIES } from "@/lib/geo";
import { cn } from "@/lib/utils";

type Props = {
  country?: string;
  city?: string;
  countryLabel: string;
  cityLabel: string;
  allCountriesLabel: string;
  allCitiesLabel: string;
  onCountryChange: (code: string) => void;
  onCityChange: (city: string) => void;
};

export function CountryCitySelect({
  country,
  city,
  countryLabel,
  cityLabel,
  allCountriesLabel,
  allCitiesLabel,
  onCountryChange,
  onCityChange,
}: Props) {
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const countryRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  const activeCountry = COUNTRIES.find((c) => c.code === country);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nameAr.includes(countryQuery.trim()),
    );
  }, [countryQuery]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    const list = activeCountry?.cities ?? [];
    if (!q) return list;
    return list.filter((c) => c.toLowerCase().includes(q));
  }, [cityQuery, activeCountry]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div ref={countryRef} className="relative">
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {countryLabel}
        </label>
        <button
          type="button"
          onClick={() => {
            setCountryOpen((v) => !v);
            setCityOpen(false);
          }}
          className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-3 text-sm shadow-xs transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <span className={cn(!country && "text-muted-foreground")}>
            {activeCountry?.name ?? allCountriesLabel}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        {countryOpen ? (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={countryQuery}
                onChange={(e) => setCountryQuery(e.target.value)}
                placeholder={allCountriesLabel}
                className="h-8 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onCountryChange(c.code);
                    setCountryOpen(false);
                    setCountryQuery("");
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"
                >
                  <span>{c.name}</span>
                  {c.code === country ? (
                    <Check className="h-4 w-4 text-brand-600" />
                  ) : null}
                </button>
              ))}
              {filteredCountries.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">—</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div ref={cityRef} className="relative">
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {cityLabel}
        </label>
        <button
          type="button"
          disabled={!activeCountry}
          onClick={() => {
            setCityOpen((v) => !v);
            setCountryOpen(false);
          }}
          className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-3 text-sm shadow-xs transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={cn(!city && "text-muted-foreground")}>
            {city || allCitiesLabel}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        {cityOpen && activeCountry ? (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder={allCitiesLabel}
                className="h-8 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filteredCities.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onCityChange(c);
                    setCityOpen(false);
                    setCityQuery("");
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"
                >
                  <span>{c}</span>
                  {c === city ? <Check className="h-4 w-4 text-brand-600" /> : null}
                </button>
              ))}
              {filteredCities.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">—</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
