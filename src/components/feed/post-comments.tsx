"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addCommentAction,
  getCommentsAction,
  likeCommentAction,
} from "@/server/actions/social-actions";
import { Link } from "@/i18n/navigation";
import { formatDistanceToNow } from "date-fns";
import { ar, nl } from "date-fns/locale";
import type { Locale } from "date-fns";
import { useLocale } from "next-intl";

type CommentItem = {
  id: string;
  content: string;
  createdAt: Date | string;
  likeCount: number;
  author: {
    profile: {
      displayName: string;
      username: string;
      avatarUrl: string | null;
    } | null;
  };
  likes?: { userId: string }[];
  replies?: CommentItem[];
};

type PostCommentsProps = {
  postId: string;
  onCountChange: (delta: number) => void;
};

export function PostComments({ postId, onCountChange }: PostCommentsProps) {
  const t = useTranslations("home.post");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : nl;
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      const res = await getCommentsAction(postId);
      setComments(res);
    });
  };

  return (
    <div className="border-t border-border px-4 py-3 sm:px-5">
      {!comments ? (
        <button
          type="button"
          onClick={load}
          disabled={pending}
          className="w-full rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-brand-300 hover:text-foreground"
        >
          {t("viewComments")}
        </button>
      ) : (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noComments")}</p>
          ) : (
            comments.map((c) => (
              <CommentRow
                key={c.id}
                comment={c}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                replyText={replyText}
                setReplyText={setReplyText}
                pending={pending}
                startTransition={startTransition}
                postId={postId}
                dateLocale={dateLocale}
                onCountChange={onCountChange}
                onReplyAdded={load}
              />
            ))
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("writeComment")}
          className="h-11 flex-1 rounded-xl border border-input bg-card px-3 text-sm"
        />
        <Button
          type="button"
          size="sm"
          loading={pending}
          disabled={!text.trim()}
          onClick={() => {
            startTransition(async () => {
              await addCommentAction(postId, text.trim());
              setText("");
              onCountChange(1);
              load();
            });
          }}
        >
          {t("send")}
        </Button>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  replyTo,
  setReplyTo,
  replyText,
  setReplyText,
  pending,
  startTransition,
  postId,
  dateLocale,
  onCountChange,
  onReplyAdded,
}: {
  comment: CommentItem;
  replyTo: string | null;
  setReplyTo: (id: string | null) => void;
  replyText: string;
  setReplyText: (value: string) => void;
  pending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
  postId: string;
  dateLocale: Locale;
  onCountChange: (delta: number) => void;
  onReplyAdded: () => void;
}) {
  const t = useTranslations("home.post");
  const [liked, setLiked] = useState(Boolean(comment.likes?.length));
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const profile = comment.author.profile;

  return (
    <div>
      <div className="flex items-start gap-2.5">
        <Link href={`/profile/${profile?.username ?? ""}`}>
          <Avatar
            src={profile?.avatarUrl}
            fallback={profile?.displayName ?? "U"}
            size="md"
            alt={profile?.displayName ?? ""}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-muted/60 px-3 py-2">
            <Link
              href={`/profile/${profile?.username ?? ""}`}
              className="text-xs font-semibold text-foreground hover:underline"
            >
              {profile?.displayName ?? "User"}
            </Link>
            <p className="whitespace-pre-wrap break-words text-sm text-foreground">
              {comment.content}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              className="inline-flex items-center gap-1 transition hover:text-foreground"
              onClick={() => {
                startTransition(async () => {
                  try {
                    const res = await likeCommentAction(comment.id);
                    setLiked(res.liked);
                    setLikeCount((c) =>
                      res.liked ? c + 1 : Math.max(0, c - 1),
                    );
                  } catch {
                    /* login required */
                  }
                });
              }}
            >
              <Heart
                className={cn("h-3.5 w-3.5", liked && "fill-current text-brand-600")}
              />
              {likeCount > 0 ? <span>{likeCount}</span> : null}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 transition hover:text-foreground"
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {t("reply")}
            </button>
            <span>
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: dateLocale,
              })}
            </span>
          </div>

          {replyTo === comment.id ? (
            <div className="mt-2 flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t("writeComment")}
                className="h-10 flex-1 rounded-xl border border-input bg-card px-3 text-sm"
              />
              <Button
                type="button"
                size="sm"
                loading={pending}
                disabled={!replyText.trim()}
                onClick={() => {
                  startTransition(async () => {
                    await addCommentAction(postId, replyText.trim(), comment.id);
                    setReplyText("");
                    setReplyTo(null);
                    onCountChange(1);
                    onReplyAdded();
                  });
                }}
              >
                {t("send")}
              </Button>
            </div>
          ) : null}

          {comment.replies && comment.replies.length > 0 ? (
            <div className="mt-2 space-y-2 ps-2">
              {comment.replies.map((r) => (
                <div key={r.id} className="flex items-start gap-2.5">
                  <Avatar
                    src={r.author.profile?.avatarUrl}
                    fallback={r.author.profile?.displayName ?? "U"}
                    size="md"
                  />
                  <div className="min-w-0 flex-1 rounded-2xl bg-muted/60 px-3 py-2">
                    <Link
                      href={`/profile/${r.author.profile?.username ?? ""}`}
                      className="text-xs font-semibold hover:underline"
                    >
                      {r.author.profile?.displayName ?? "User"}
                    </Link>
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {r.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
