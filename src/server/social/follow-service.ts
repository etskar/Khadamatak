import "server-only";
import { db } from "@/lib/db";

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error("SELF_FOLLOW");
  const existing = await db.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (existing) return existing;
  return db.follow.create({
    data: { followerId, followingId },
  });
}

export async function unfollowUser(followerId: string, followingId: string) {
  return db.follow.deleteMany({
    where: { followerId, followingId },
  });
}

export async function isFollowing(followerId: string, followingId: string) {
  const follow = await db.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  return Boolean(follow);
}

export async function getFollowCounts(userId: string) {
  const [followers, following] = await Promise.all([
    db.follow.count({ where: { followingId: userId } }),
    db.follow.count({ where: { followerId: userId } }),
  ]);
  return { followers, following };
}

export async function getFollowers(userId: string) {
  return db.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: {
        include: {
          profile: true,
          verification: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getFollowing(userId: string) {
  return db.follow.findMany({
    where: { followerId: userId },
    include: {
      following: {
        include: {
          profile: true,
          verification: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
