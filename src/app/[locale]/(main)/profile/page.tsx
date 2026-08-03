import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getProfileByUserId,
  getSavedPosts,
  getUserPosts,
} from "@/server/users/profile-service";
import { ProfileView } from "@/components/profile/profile-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  return { title: t("title") };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/profile`);
  }

  const profile = await getProfileByUserId(session.user.id);
  if (!profile) redirect(`/${locale}`);

  const [posts, saved] = await Promise.all([
    getUserPosts(session.user.id, session.user.id),
    getSavedPosts(session.user.id),
  ]);

  return (
    <ProfileView
      isOwner
      profile={{
        displayName: profile.displayName,
        username: profile.username,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,
        country: profile.country,
        city: profile.city,
        work: profile.work,
        education: profile.education,
        hobbies: profile.hobbies,
        languages: profile.languages,
        website: profile.website,
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
        joinDate: profile.user.createdAt.toISOString(),
        verificationStatus: profile.user.verification?.status ?? "not_started",
        realName: profile.user.realName,
        email: profile.user.email,
      }}
      posts={posts.map((p) => ({
        id: p.id,
        content: p.content,
        createdAt: p.createdAt,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
        shareCount: p.shareCount,
        likedByMe: Array.isArray(p.likes) ? p.likes.length > 0 : false,
        savedByMe: Array.isArray(p.savedBy) ? p.savedBy.length > 0 : false,
        media: p.media,
        author: {
          id: p.author.id,
          profile: p.author.profile,
          verification: p.author.verification,
        },
      }))}
      savedPosts={saved
        .filter((s) => s.post)
        .map((s) => ({
          id: s.post.id,
          content: s.post.content,
          createdAt: s.post.createdAt,
          likeCount: s.post._count.likes,
          commentCount: s.post._count.comments,
          shareCount: s.post.shareCount,
          media: s.post.media,
          author: {
            id: s.post.author.id,
            profile: s.post.author.profile,
            verification: s.post.author.verification,
          },
        }))}
    />
  );
}
