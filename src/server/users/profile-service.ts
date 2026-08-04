import "server-only";
import { db } from "@/lib/db";
import type { AppLocale } from "@/i18n/routing";

export async function getProfileByUsername(username: string, viewerId?: string | null) {
  const profile = await db.profile.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      user: {
        select: {
          id: true,
          createdAt: true,
          verification: true,
          locale: true,
          _count: {
            select: {
              followers: true,
              following: true,
            },
          },
        },
      },
    },
  });
  if (!profile) return null;

  const followCounts = {
    followers: profile.user._count.followers ?? 0,
    following: profile.user._count.following ?? 0,
  };
  const { _count, ...userData } = profile.user;

  let isFollowing = false;
  if (viewerId) {
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: profile.userId,
        },
      },
    });
    isFollowing = Boolean(follow);
  }

  return { ...profile, user: userData, followCounts, isFollowing };
}

export async function getProfileByUserId(userId: string) {
  const profile = await db.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          realName: true,
          createdAt: true,
          locale: true,
          theme: true,
          notificationsOn: true,
          emailVerified: true,
          phoneVerifiedAt: true,
          verification: true,
          _count: {
            select: {
              followers: true,
              following: true,
            },
          },
        },
      },
    },
  });
  if (!profile) return null;

  const followCounts = {
    followers: profile.user._count.followers ?? 0,
    following: profile.user._count.following ?? 0,
  };
  const { _count, ...userData } = profile.user;

  return { ...profile, user: userData, followCounts };
}

export async function updateProfile(
  userId: string,
  data: {
    displayName?: string;
    bio?: string | null;
    country?: string | null;
    city?: string | null;
    work?: string | null;
    education?: string | null;
    hobbies?: string[] | null;
    languages?: string[] | null;
    website?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
  },
) {
  return db.profile.update({
    where: { userId },
    data: {
      displayName: data.displayName,
      bio: data.bio,
      country: data.country,
      city: data.city,
      work: data.work,
      education: data.education,
      hobbies: data.hobbies ? JSON.stringify(data.hobbies) : undefined,
      languages: data.languages ? JSON.stringify(data.languages) : undefined,
      website: data.website,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      avatarUrl: data.avatarUrl,
      coverUrl: data.coverUrl,
    },
  });
}

export async function updateUserPreferences(
  userId: string,
  data: {
    locale?: AppLocale;
    theme?: string;
    notificationsOn?: boolean;
  },
) {
  return db.user.update({
    where: { id: userId },
    data: {
      locale: data.locale,
      theme: data.theme,
      notificationsOn: data.notificationsOn,
    },
  });
}

export async function getUserPosts(userId: string, viewerId?: string | null) {
  return db.post.findMany({
    where: { authorId: userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      media: true,
      author: { include: { profile: true, verification: true } },
      likes: viewerId ? { where: { userId: viewerId } } : false,
      savedBy: viewerId ? { where: { userId: viewerId } } : false,
      _count: { select: { likes: true, comments: true } },
    },
  });
}

export async function getSavedPosts(userId: string) {
  return db.savedPost.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        include: {
          media: true,
          author: { include: { profile: true, verification: true } },
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  });
}
