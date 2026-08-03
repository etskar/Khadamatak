"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  name: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
};

export function AutocompleteInput({
  label,
  name,
  options,
  value,
  onChange,
  placeholder,
  allowCustom = false,
}: Props) {
  const [open, setOpen] = useState(false);
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

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options
      .filter((o) => o.toLowerCase().includes(q))
      .slice(0, 8);
  }, [value, options]);

  const showSuggestions =
    open && (filtered.length > 0 || (allowCustom && value.trim().length > 0));

  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <input
        type="text"
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      />
      {showSuggestions ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm hover:bg-muted",
                  o === value && "font-medium text-brand-700",
                )}
              >
                {o}
              </button>
            ))}
            {allowCustom && value.trim() && !filtered.includes(value.trim()) ? (
              <p className="px-3 py-1.5 text-xs text-muted-foreground">
                {value.trim()} — {""}
                <span className="italic">custom value</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
