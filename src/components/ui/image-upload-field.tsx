"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, RefreshCw, X } from "lucide-react";
import { ImageCropDialog } from "./image-crop-dialog";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  aspect: number;
  circular?: boolean;
  previewUrl: string | null;
  onFile: (file: File | null) => void;
};

export function ImageUploadField({
  label,
  aspect,
  circular,
  previewUrl,
  onFile,
}: Props) {
  const t = useTranslations("common");
  const [dragOver, setDragOver] = useState(false);
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setRawUrl(url);
    setCropping(true);
  }

  async function confirmCrop(blob: Blob) {
    const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
    if (rawUrl) URL.revokeObjectURL(rawUrl);
    setRawUrl(null);
    setCropping(false);
    onFile(file);
  }

  function cancelCrop() {
    if (rawUrl) URL.revokeObjectURL(rawUrl);
    setRawUrl(null);
    setCropping(false);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition",
          dragOver
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
            : "border-border bg-muted/40 hover:border-brand-300 hover:bg-muted/70",
        )}
        style={{ aspectRatio: String(aspect) }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className={cn(
              "h-full w-full object-cover",
              circular && "rounded-full",
            )}
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus className="h-7 w-7" />
            <span className="text-sm font-medium">{label}</span>
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {previewUrl ? (
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("replace")}
          </button>
          <button
            type="button"
            onClick={() => onFile(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-[var(--danger-soft)]"
          >
            <X className="h-3.5 w-3.5" />
            {t("remove")}
          </button>
        </div>
      ) : null}

      {cropping && rawUrl ? (
        <ImageCropDialog
          src={rawUrl}
          aspect={aspect}
          circular={circular}
          onCancel={cancelCrop}
          onConfirm={confirmCrop}
        />
      ) : null}
    </div>
  );
}
