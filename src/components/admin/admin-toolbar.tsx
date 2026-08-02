"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export type AdminFilterOption = { value: string; label: string };
export type AdminFilter = {
  param: string;
  label: string;
  allLabel: string;
  options: AdminFilterOption[];
};

export function AdminToolbar({
  searchPlaceholder,
  filters = [],
}: {
  searchPlaceholder: string;
  filters?: AdminFilter[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("query") ?? "");

  function push(params: URLSearchParams) {
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("query", value);
    else params.delete("query");
    push(params);
  }

  function changeFilter(param: string, next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(param, next);
    else params.delete(param);
    push(params);
  }

  return (
    <div className="mb-4 flex flex-col gap-2.5 lg:flex-row lg:items-center">
      <form
        onSubmit={submitSearch}
        className="w-full max-w-sm"
        role="search"
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={searchPlaceholder}
          leftIcon={<Search className="h-4 w-4" />}
          aria-label={searchPlaceholder}
        />
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <label key={filter.param} className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {filter.label}
            </span>
            <select
              className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:outline-none"
              value={searchParams.get(filter.param) ?? ""}
              onChange={(e) => changeFilter(filter.param, e.target.value)}
            >
              <option value="">{filter.allLabel}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
