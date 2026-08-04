"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ImagePlus, MapPin, Smile, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { createPostAction } from "@/server/actions/social-actions";
import { uploadPostMediaAction } from "@/server/actions/profile-actions";
import { useSession } from "next-auth/react";

export function CreatePostForm() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const { data } = useSession();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<
    { type: "image" | "video"; url: string }[]
  >([]);
  const [pending, startTransition] = useTransition();

  const onUpload = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadPostMediaAction(fd);
    if (res.ok) {
      setMedia((m) => [
        ...m,
        { type: res.type as "image" | "video", url: res.url },
      ]);
    }
  };

  const onPublish = () => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("content", content);
        fd.set("media", JSON.stringify(media));
        await createPostAction(fd);
        toast({ title: t("published"), variant: "success" });
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      } catch {
        toast({ title: tCommon("error"), variant: "danger" });
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl animate-in-up">
      <div className="mb-5 flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label={tCommon("back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">
          {t("createPostTitle")}
        </h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
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
            className="min-h-40 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
        </div>

        {media.length > 0 ? (
          <div className="mb-4 mt-2 flex flex-wrap gap-2">
            {media.map((m) => (
              <div
                key={m.url}
                className="relative h-24 w-24 overflow-hidden rounded-xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  className="absolute end-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                  onClick={() =>
                    setMedia((list) => list.filter((x) => x.url !== m.url))
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-1">
            <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl hover:bg-muted">
              <ImagePlus className="h-5 w-5 text-brand-600" />
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
            <Button type="button" variant="ghost" size="icon" disabled>
              <Smile className="h-5 w-5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" disabled>
              <MapPin className="h-5 w-5" />
            </Button>
          </div>
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
    </div>
  );
}
