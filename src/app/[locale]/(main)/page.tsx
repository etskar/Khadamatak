import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getFeed } from "@/server/social/post-service";
import { HomeFeed } from "@/components/feed/home-feed";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return { title: t("title") };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const feed = await getFeed({ viewerId: session?.user?.id });

  const items = feed.items.map((p) => ({
    id: p.id,
    content: p.content,
    createdAt: p.createdAt,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    shareCount: p.shareCount,
    likedByMe: p.likedByMe,
    savedByMe: p.savedByMe,
    media: p.media,
    author: {
      id: p.author.id,
      profile: p.author.profile,
      verification: p.author.verification,
    },
  }));

  return (
    <HomeFeed
      initialItems={items}
      initialCursor={feed.nextCursor}
      isAuthenticated={Boolean(session?.user)}
    />
  );
}
