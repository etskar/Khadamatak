"use client";

import { useState } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FiltersDrawerProps = {
  basePath: "/products" | "/services";
  categories: { id: string; label: string }[];
  initial: {
    q: string;
    category: string;
    city: string;
    min: string;
    max: string;
    verified: boolean;
  };
};

export function FiltersDrawer({ basePath, categories, initial }: FiltersDrawerProps) {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function apply(fd: FormData) {
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      const val = String(v).trim();
      if (val) params.set(k, val);
    }
    if (fd.get("verified") === "on") params.set("verified", "1");
    router.push(`${pathname}?${params.toString()}` as "/");
    setOpen(false);
  }

  const activeCount =
    [initial.category, initial.city, initial.min, initial.max].filter(Boolean)
      .length + (initial.verified ? 1 : 0);

  return (
    <>
      {/* Trigger row */}
      <div className="mt-4 flex items-center gap-2">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            apply(new FormData(e.currentTarget));
          }}
        >
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={initial.q}
            placeholder={t("searchPlaceholder")}
            className="h-11 w-full rounded-xl border border-input bg-card ps-9 pe-3 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </form>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="relative"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">{t("filters")}</span>
          {activeCount > 0 ? (
            <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </div>

      {/* Slide-over */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition",
          open ? "visible" : "invisible",
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            "absolute inset-0 bg-[var(--overlay)] transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 end-0 flex w-full max-w-sm flex-col bg-card shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={t("filters")}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">{t("filters")}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted"
              aria-label={t("close")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form
            className="flex-1 space-y-4 overflow-y-auto p-5"
            onSubmit={(e) => {
              e.preventDefault();
              apply(new FormData(e.currentTarget));
            }}
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("category")}</label>
              <select
                name="category"
                defaultValue={initial.category}
                className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
              >
                <option value="">{t("allCategories")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("city")}</label>
              <Input name="city" defaultValue={initial.city} placeholder={t("city")} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("price")}</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  name="min"
                  defaultValue={initial.min}
                  placeholder={t("minPrice")}
                  type="number"
                  step="0.01"
                />
                <Input
                  name="max"
                  defaultValue={initial.max}
                  placeholder={t("maxPrice")}
                  type="number"
                  step="0.01"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="verified"
                defaultChecked={initial.verified}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              {t("verifiedOnly")}
            </label>
          </form>

          <div className="flex gap-2 border-t border-border p-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                router.push(basePath);
                setOpen(false);
              }}
            >
              {t("reset")}
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={(e) => {
                const form = e.currentTarget.closest("div")?.querySelector("form");
                if (form) apply(new FormData(form));
              }}
            >
              {t("applyFilters")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
