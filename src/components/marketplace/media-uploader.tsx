"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MediaItem = {
  id: string;
  file: File;
  previewUrl: string;
  type: "image" | "video";
};

type Props = {
  label: string;
  hint?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
};

export function MediaUploader({
  label,
  hint,
  maxFiles = 8,
  maxSizeMb = 10,
  items,
  onChange,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const next = [...items];
    for (const file of Array.from(files)) {
      if (next.length >= maxFiles) break;
      if (file.size > maxSizeMb * 1024 * 1024) continue;
      const type: "image" | "video" = file.type.startsWith("video/")
        ? "video"
        : "image";
      if (!["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"].includes(file.type)) continue;
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        type,
      });
    }
    onChange(next);
  }

  function remove(id: string) {
    const target = items.find((i) => i.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(items.filter((i) => i.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    const idx = items.findIndex((i) => i.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition",
          dragOver
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
            : "border-border bg-muted/40 hover:border-brand-300 hover:bg-muted/70",
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ImagePlus className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium">
          {items.length === 0 ? "Drop images here" : "Add more"}
        </p>
        <p className="text-xs text-muted-foreground">
          or click to browse · {hint ?? `up to ${maxFiles} files, ${maxSizeMb} MB each`}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {items.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border"
            >
              {item.type === "video" ? (
                <video src={item.previewUrl} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      move(item.id, -1);
                    }}
                    disabled={idx === 0}
                    className="rounded-lg bg-white/90 p-1 text-black disabled:opacity-30"
                    aria-label="Move earlier"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      move(item.id, 1);
                    }}
                    disabled={idx === items.length - 1}
                    className="rounded-lg bg-white/90 p-1 text-black disabled:opacity-30"
                    aria-label="Move later"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(item.id);
                  }}
                  className="rounded-lg bg-white/90 p-1 text-red-600"
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="absolute start-1.5 top-1.5 rounded-full bg-black/50 px-1.5 text-[10px] font-semibold text-white">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
