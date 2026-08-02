"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProductsFilters({
  categories,
  initial,
}: {
  categories: { id: string; label: string }[];
  initial: {
    q: string;
    category: string;
    city: string;
    min: string;
    max: string;
    verified: boolean;
  };
}) {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const pathname = usePathname();

  return (
    <form
      className="grid gap-2 rounded-2xl border border-border bg-card p-3 sm:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const params = new URLSearchParams();
        for (const [k, v] of fd.entries()) {
          const val = String(v).trim();
          if (val) params.set(k, val);
        }
        if (fd.get("verified") === "on") params.set("verified", "1");
        router.push(`${pathname}?${params.toString()}` as "/");
      }}
    >
      <Input name="q" defaultValue={initial.q} placeholder={t("searchPlaceholder")} containerClassName="sm:col-span-2" />
      <select
        name="category"
        defaultValue={initial.category}
        className="h-12 rounded-xl border border-input bg-card px-3 text-sm"
      >
        <option value="">{t("allCategories")}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <Input name="city" defaultValue={initial.city} placeholder={t("city")} />
      <Input name="min" defaultValue={initial.min} placeholder={t("minPrice")} type="number" step="0.01" />
      <Input name="max" defaultValue={initial.max} placeholder={t("maxPrice")} type="number" step="0.01" />
      <label className="flex items-center gap-2 text-xs sm:col-span-2">
        <input type="checkbox" name="verified" defaultChecked={initial.verified} />
        {t("verifiedOnly")}
      </label>
      <Button type="submit" className="sm:col-span-2">
        {t("applyFilters")}
      </Button>
    </form>
  );
}
