"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import { uploadGroupCoverAction } from "@/server/actions/admin-actions";
import { toast } from "@/components/ui/toast";

export function GroupCoverUpload({ groupId, coverUrl }: { groupId: string; coverUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(coverUrl);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("groupId", groupId);
      fd.set("file", file);
      const res = await uploadGroupCoverAction(fd);
      if (res.ok) {
        setPreview(res.data?.coverUrl ?? preview);
        toast({ title: "Cover uploaded", variant: "success" });
      } else {
        toast({ title: res.error ?? "Upload failed", variant: "danger" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "danger" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove cover image?")) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("groupId", groupId);
      fd.set("file", new File([], ""));
      const res = await uploadGroupCoverAction(fd);
      if (res.ok) setPreview(null);
    } catch {
      toast({ title: "Failed to remove cover", variant: "danger" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Group cover" className="h-36 w-full object-cover sm:h-44" />
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="absolute end-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 transition hover:border-brand-300 hover:bg-muted/50 sm:h-44">
          <Upload className="h-7 w-7 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {uploading ? "Uploading..." : "Upload cover image"}
          </span>
          <span className="text-xs text-muted-foreground">JPEG, PNG, WebP · Max 5MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPreview(URL.createObjectURL(file));
                void handleUpload(file);
              }
              e.target.value = "";
            }}
          />
        </label>
      )}

      {preview ? (
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-brand-600 transition hover:text-brand-700">
          <Upload className="h-3.5 w-3.5" />
          Replace cover
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPreview(URL.createObjectURL(file));
                void handleUpload(file);
              }
              e.target.value = "";
            }}
          />
        </label>
      ) : null}
    </div>
  );
}
