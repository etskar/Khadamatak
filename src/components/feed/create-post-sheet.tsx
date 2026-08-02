"use client";

import { useState, useTransition } from "react";
import { ImagePlus, MapPin, Smile, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { useUiStore } from "@/stores/ui-store";
import { toast } from "@/components/ui/toast";
import { createPostAction } from "@/server/actions/social-actions";
import { uploadPostMediaAction } from "@/server/actions/profile-actions";
import { useSession } from "next-auth/react";

export function CreatePostSheet() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const open = useUiStore((s) => s.createPostOpen);
  const setOpen = useUiStore((s) => s.setCreatePostOpen);
  const { data } = useSession();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<{ type: "image" | "video"; url: string }[]>(
    [],
  );
  const [pending, startTransition] = useTransition();

  const onUpload = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadPostMediaAction(fd);
    if (res.ok) {
      setMedia((m) => [...m, { type: res.type as "image" | "video", url: res.url }]);
    }
  };

  const onPublish = () => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("content", content);
        fd.set("media", JSON.stringify(media));
        await createPostAction(fd);
        setContent("");
        setMedia([]);
        setOpen(false);
        toast({ title: t("published"), variant: "success" });
        router.refresh();
      } catch {
        toast({ title: tCommon("error"), variant: "danger" });
      }
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      title={t("createPostTitle")}
    >
      <div className="flex gap-3">
        <Avatar
          src={data?.user?.image}
          fallback={data?.user?.name ?? "U"}
          size="md"
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("createPostPlaceholder")}
          className="min-h-32 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {media.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {media.map((m) => (
            <div key={m.url} className="relative h-20 w-20 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute end-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                onClick={() => setMedia((list) => list.filter((x) => x.url !== m.url))}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-1">
          <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg hover:bg-muted">
            <ImagePlus className="h-5 w-5" />
            <input
              type="file"
              accept="image/*,video/mp4"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
          </label>
          <Button type="button" variant="ghost" size="icon-sm" disabled>
            <Smile className="h-5 w-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" disabled>
            <MapPin className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            loading={pending}
            disabled={!content.trim() && media.length === 0}
            onClick={onPublish}
          >
            {t("publish")}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
