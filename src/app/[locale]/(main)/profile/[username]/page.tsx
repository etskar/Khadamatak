import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getProfileByUsername,
  getUserPosts,
} from "@/server/users/profile-service";
import { ProfileView } from "@/components/profile/profile-view";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  setRequestLocale(locale);
  const session = await auth();
  const profile = await getProfileByUsername(username, session?.user?.id);
  if (!profile) notFound();

  const isOwner = session?.user?.id === profile.userId;
  const posts = await getUserPosts(profile.userId, session?.user?.id);

  return (
    <ProfileView
      isOwner={isOwner}
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
        contactEmail: isOwner ? profile.contactEmail : null,
        contactPhone: isOwner ? profile.contactPhone : null,
        joinDate: profile.user.createdAt.toISOString(),
        verificationStatus: profile.user.verification?.status ?? "not_started",
        realName: isOwner ? null : null,
        email: null,
        userId: profile.userId,
        followCounts: profile.followCounts,
        isFollowing: profile.isFollowing,
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
    />
  );
}
