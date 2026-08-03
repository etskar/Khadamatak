"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { PostCardSkeleton } from "@/components/ui/skeleton";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { CreatePostBox } from "./create-post-box";
import { CreatePostSheet } from "./create-post-sheet";
import { PostCard, type FeedPost } from "./post-card";
import { fetchFeedAction } from "@/server/actions/social-actions";

const tabs = ["forYou", "following"] as const;

type HomeFeedProps = {
  initialItems: FeedPost[];
  initialCursor: string | null;
  isAuthenticated: boolean;
};

export function HomeFeed({
  initialItems,
  initialCursor,
  isAuthenticated,
}: HomeFeedProps) {
  const t = useTranslations("home");
  const setCreatePostOpen = useUiStore((s) => s.setCreatePostOpen);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("forYou");
  const [items, setItems] = useState<FeedPost[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [pending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    if (!cursor || pending) return;
    startTransition(async () => {
      const res = await fetchFeedAction(cursor);
      setItems((prev) => [
        ...prev,
        ...res.items.map((p) => ({
          ...p,
          createdAt: p.createdAt,
        })),
      ]);
      setCursor(res.nextCursor);
    });
  }, [cursor, pending]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <div className="feed-container animate-in-up">
      {isAuthenticated ? <CreatePostBox /> : null}

      <div className="mt-3 mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-2 pt-2">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative flex-1 rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
                  activeTab === tab
                    ? "text-brand-700 dark:text-brand-300"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t(`sections.${tab}`)}
                {activeTab === tab ? (
                  <span className="absolute inset-x-6 -bottom-px h-0.5 rounded-full bg-brand-600" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/search"
          className="m-3 flex h-12 items-center gap-3 rounded-2xl border border-border bg-muted/50 px-4 text-sm text-muted-foreground transition hover:border-brand-300 hover:bg-muted"
        >
          <Sparkles className="h-4 w-4 text-brand-600" />
          <span className="truncate">{t("searchPlaceholder")}</span>
        </Link>
      </div>

      <section aria-label={t("feedTitle")} className="space-y-4">
        {items.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            actionLabel={isAuthenticated ? t("createPost") : undefined}
            onAction={
              isAuthenticated ? () => setCreatePostOpen(true) : undefined
            }
          />
        ) : (
          items.map((post) => <PostCard key={post.id} post={post} />)
        )}

        {pending ? <PostCardSkeleton /> : null}
        <div ref={sentinelRef} className="h-8" />
      </section>

      {isAuthenticated ? <CreatePostSheet /> : null}
    </div>
  );
}
