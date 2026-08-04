"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PostCardSkeleton } from "@/components/ui/skeleton";
import { CreatePostBox } from "./create-post-box";
import { PostCard, type FeedPost } from "./post-card";
import { fetchFeedAction } from "@/server/actions/social-actions";

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

      <section aria-label={t("feedTitle")} className="space-y-4">
        {items.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            actionLabel={isAuthenticated ? t("createPost") : undefined}
            href={isAuthenticated ? "/create-post" : undefined}
          />
        ) : (
          items.map((post) => <PostCard key={post.id} post={post} />)
        )}

        {pending ? <PostCardSkeleton /> : null}
        <div ref={sentinelRef} className="h-8" />
      </section>
    </div>
  );
}
