"use client";

import { useState, useTransition } from "react";
import {
  Bookmark,
  Flag,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  likePostAction,
  reportPostAction,
  savePostAction,
  sharePostAction,
} from "@/server/actions/social-actions";
import { toast } from "@/components/ui/toast";
import { Link } from "@/i18n/navigation";
import { formatDistanceToNow } from "date-fns";
import { ar, nl } from "date-fns/locale";
import { useLocale } from "next-intl";
import { PostComments } from "./post-comments";

export type FeedPost = {
  id: string;
  content: string;
  createdAt: string | Date;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  media?: { id: string; type: string; url: string }[];
  author: {
    id: string;
    profile: {
      displayName: string;
      username: string;
      avatarUrl: string | null;
    } | null;
    verification?: { status: string } | null;
  };
};

type PostCardProps = {
  post: FeedPost;
  className?: string;
  showComments?: boolean;
};

export function PostCard({ post, className, showComments = true }: PostCardProps) {
  const t = useTranslations("home.post");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [saved, setSaved] = useState(Boolean(post.savedByMe));
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const profile = post.author.profile;
  const dateLocale = locale === "ar" ? ar : nl;
  const timeLabel = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: dateLocale,
  });

  const onLike = () => {
    startTransition(async () => {
      try {
        const res = await likePostAction(post.id);
        setLiked(res.liked);
        setLikeCount((c) => (res.liked ? c + 1 : Math.max(0, c - 1)));
      } catch {
        toast({ title: tCommon("loginRequired", { defaultValue: "Login required" }), variant: "warning" });
      }
    });
  };

  const onSave = () => {
    startTransition(async () => {
      try {
        const res = await savePostAction(post.id);
        setSaved(res.saved);
      } catch {
        toast({ title: tCommon("loginRequired"), variant: "warning" });
      }
    });
  };

  const onShare = () => {
    startTransition(async () => {
      try {
        const res = await sharePostAction(post.id);
        await navigator.clipboard.writeText(res.url);
        toast({ title: t("linkCopied"), variant: "success" });
      } catch {
        toast({ title: tCommon("error"), variant: "danger" });
      }
    });
  };

  const onReport = () => {
    startTransition(async () => {
      try {
        await reportPostAction(post.id, "inappropriate");
        toast({ title: t("reported"), variant: "success" });
        setMenuOpen(false);
      } catch {
        toast({ title: tCommon("error"), variant: "danger" });
      }
    });
  };

  return (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-md", className)}>
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <Link href={`/profile/${profile?.username ?? post.author.id}`}>
          <Avatar
            src={profile?.avatarUrl}
            fallback={profile?.displayName ?? "U"}
            alt={profile?.displayName ?? ""}
            size="lg"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/profile/${profile?.username ?? ""}`}
                  className="truncate font-semibold text-foreground hover:underline"
                >
                  {profile?.displayName ?? "User"}
                </Link>
                {post.author.verification?.status === "verified" ? (
                  <Badge variant="success" className="px-1.5 py-0">
                    ✓
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                @{profile?.username} · {timeLabel}
              </p>
            </div>
            <div className="relative">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label={tCommon("more")}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {menuOpen ? (
                <div className="absolute end-0 z-10 mt-1 w-44 rounded-xl border border-border bg-card p-1 shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                    onClick={onShare}
                  >
                    <Link2 className="h-4 w-4" />
                    {t("copyLink")}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-muted"
                    onClick={onReport}
                  >
                    <Flag className="h-4 w-4" />
                    {t("report")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
            {renderContent(post.content)}
          </p>
        </div>
      </div>

      {post.media && post.media.length > 0 ? (
        <div className="px-4 pb-3 sm:px-5">
          <div
            className={cn(
              "grid gap-2 overflow-hidden rounded-2xl border border-border bg-muted",
              post.media.length > 1 && "grid-cols-2",
            )}
          >
            {post.media.map((m) =>
              m.type === "video" ? (
                <video
                  key={m.id}
                  src={m.url}
                  controls
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m.id}
                  src={m.url}
                  alt=""
                  className="aspect-[16/10] w-full object-cover"
                />
              ),
            )}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-1 border-t border-border/70 px-2 py-1.5 sm:px-3">
        <ActionButton
          icon={Heart}
          label={t("like")}
          count={likeCount}
          active={liked}
          onClick={onLike}
          disabled={pending}
        />
        <ActionButton
          icon={MessageCircle}
          label={t("comment")}
          count={commentCount}
          onClick={() => setCommentOpen((v) => !v)}
        />
        <ActionButton icon={Share2} label={t("share")} count={post.shareCount} onClick={onShare} />
        <ActionButton
          icon={Bookmark}
          label={t("save")}
          active={saved}
          onClick={onSave}
          disabled={pending}
        />
      </div>

      {showComments && commentOpen ? (
        <PostComments
          postId={post.id}
          onCountChange={(delta) => setCommentCount((c) => c + delta)}
        />
      ) : null}
    </Card>
  );
}

function ActionButton({
  icon: Icon,
  label,
  count,
  active,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-medium transition sm:text-sm",
        active
          ? "text-brand-700 dark:text-brand-300"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      aria-label={label}
    >
      <Icon
        className={cn("h-5 w-5", active && "fill-current")}
        strokeWidth={1.85}
      />
      <span className="hidden sm:inline">{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="text-xs tabular-nums">{count}</span>
      ) : null}
    </button>
  );
}

function renderContent(content: string) {
  const parts = content.split(/([#@][\p{L}\p{N}_]+)/gu);
  return parts.map((part, i) => {
    if (part.startsWith("#") || part.startsWith("@")) {
      return (
        <span key={i} className="font-semibold text-brand-700 dark:text-brand-300">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
