"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function JobsFilters({
  categories,
  initial,
}: {
  categories: { id: string; label: string }[];
  initial: { q: string; category: string; city: string; type: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [city, setCity] = useState(initial.city);
  const [type, setType] = useState(initial.type);

  function apply() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (type) params.set("type", type);
    router.push(`/jobs${params.size ? `?${params.toString()}` : ""}`);
    setOpen(false);
  }

  function reset() {
    setQ("");
    setCategory("");
    setCity("");
    setType("");
    router.push("/jobs");
    setOpen(false);
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
            }}
            placeholder="Search jobs…"
            className="h-11 w-full rounded-xl border border-input bg-card ps-9 pe-3 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen((v) => !v)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {open ? (
        <div className="grid gap-2 rounded-2xl border border-border bg-card p-3 sm:grid-cols-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
          >
            <option value="">All types</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
            <option value="internship">Internship</option>
          </select>
          <div className="flex gap-2 sm:col-span-3">
            <Button type="button" onClick={apply} className="flex-1">
              Apply
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
