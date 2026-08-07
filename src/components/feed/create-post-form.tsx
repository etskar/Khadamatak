"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ImagePlus,
  MapPin,
  Smile,
  ArrowLeft,
  ShoppingBag,
  Briefcase,
  Building2,
  Users,
  Hash,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { createPostAction } from "@/server/actions/social-actions";
import { uploadPostMediaAction } from "@/server/actions/profile-actions";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const EMOJIS = ["😀","😂","❤️","🔥","👍","🎉","😍","🤝","💡","📢","✨","💪","🙏","🤔","😎","🚀"];

type PostType = "text" | "product" | "service" | "job" | "group";

const postTypes: { key: PostType; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { key: "text", icon: Hash, labelKey: "text" },
  { key: "product", icon: ShoppingBag, labelKey: "product" },
  { key: "service", icon: Briefcase, labelKey: "service" },
  { key: "job", icon: Building2, labelKey: "job" },
  { key: "group", icon: Users, labelKey: "group" },
];

export function CreatePostForm() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const { data } = useSession();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<{ type: "image" | "video"; url: string }[]>([]);
  const [pending, startTransition] = useTransition();
  const [postType, setPostType] = useState<PostType>("text");
  const [showEmoji, setShowEmoji] = useState(false);
  const [location, setLocation] = useState("");

  const onUpload = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadPostMediaAction(fd);
    if (res.ok) {
      setMedia((m) => [...m, { type: res.type as "image" | "video", url: res.url }]);
    }
  };

  const onPublish = () => {
    if (!content.trim() && media.length === 0) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("content", content);
        fd.set("media", JSON.stringify(media));
        fd.set("postType", postType);
        if (location) fd.set("location", location);
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

  const postTypeLabel = (key: PostType) => {
    if (key === "text") return t("textPost");
    if (key === "product") return t("shareProduct");
    if (key === "service") return t("shareService");
    if (key === "job") return t("shareJob");
    return t("shareGroup");
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
        <h1 className="text-xl font-bold tracking-tight">{t("createPostTitle")}</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex gap-3 p-5 pb-0">
          <Avatar
            src={data?.user?.image}
            fallback={data?.user?.name ?? "U"}
            size="md"
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={postType === "text" ? t("createPostPlaceholder") : postTypeLabel(postType)}
            className="min-h-36 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
        </div>

        {media.length > 0 ? (
          <div className="mb-4 mt-2 flex flex-wrap gap-2 px-5 sm:ps-14">
            {media.map((m, i) => (
              <div key={m.url} className="relative h-24 w-24 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white"
                  onClick={() => setMedia((list) => list.filter((_, idx) => idx !== i))}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mx-5 mb-3 flex gap-1 overflow-x-auto rounded-xl bg-muted/50 p-1 no-scrollbar sm:ms-14">
          {postTypes.map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPostType(key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                postType === key
                  ? "bg-card text-brand-700 shadow-sm dark:text-brand-300"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(key === "text" ? "textPost" : labelKey)}
            </button>
          ))}
        </div>

        {showEmoji ? (
          <div className="mx-5 mb-3 grid grid-cols-8 gap-1 rounded-xl border border-border bg-muted/30 p-2 sm:ms-14">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setContent((c) => c + emoji);
                  setShowEmoji(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        {location ? (
          <div className="mx-5 mb-3 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm sm:ms-14">
            <MapPin className="h-4 w-4 text-brand-600" />
            <span className="flex-1">{location}</span>
            <button type="button" onClick={() => setLocation("")}>
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <div className="flex items-center gap-0.5">
            <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition hover:bg-muted">
              <ImagePlus className="h-5 w-5 text-brand-600" />
              <input
                type="file"
                accept="image/*,video/mp4"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-muted",
                showEmoji && "bg-muted",
              )}
            >
              <Smile className="h-5 w-5 text-warning" />
            </button>
            <button
              type="button"
              onClick={() => {
                const loc = prompt(t("addLocation") ?? "");
                if (loc) setLocation(loc);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-muted"
            >
              <MapPin className="h-5 w-5 text-green-600" />
            </button>
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
