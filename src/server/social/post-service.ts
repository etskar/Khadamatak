import "server-only";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

function extractHashtags(content: string) {
  const matches = content.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

function extractMentions(content: string) {
  const matches = content.match(/@([a-zA-Z0-9_]+)/g) ?? [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

export async function createPost(input: {
  authorId: string;
  content: string;
  media?: { type: "image" | "video"; url: string }[];
}) {
  const content = input.content.trim();
  if (!content && (!input.media || input.media.length === 0)) {
    throw new Error("EMPTY_POST");
  }
  if (content.length > 5000) throw new Error("CONTENT_TOO_LONG");

  const hashtags = extractHashtags(content);
  const mentionNames = extractMentions(content);
  const mentionedUsers = mentionNames.length
    ? await db.profile.findMany({
        where: { username: { in: mentionNames } },
        select: { userId: true, username: true },
      })
    : [];

  const post = await db.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        authorId: input.authorId,
        content,
        media: input.media?.length
          ? {
              create: input.media.map((m, i) => ({
                type: m.type,
                url: m.url,
                sortOrder: i,
              })),
            }
          : undefined,
      },
      include: {
        media: true,
        author: {
          include: { profile: true, verification: true },
        },
      },
    });

    for (const tag of hashtags) {
      const hashtag = await tx.hashtag.upsert({
        where: { tag },
        create: { tag, postCount: 1 },
        update: { postCount: { increment: 1 } },
      });
      await tx.postHashtag.create({
        data: { postId: created.id, hashtagId: hashtag.id },
      });
    }

    for (const u of mentionedUsers) {
      await tx.postMention.create({
        data: { postId: created.id, mentionedUserId: u.userId },
      });
      await tx.notification.create({
        data: {
          userId: u.userId,
          type: "mention",
          title: "You were mentioned",
          body: content.slice(0, 120),
          href: `/?post=${created.id}`,
        },
      });
    }

    return created;
  });

  return post;
}

export async function getFeed(input: {
  viewerId?: string | null;
  cursor?: string | null;
  limit?: number;
}) {
  const limit = Math.min(input.limit ?? 10, 30);

  const posts = await db.post.findMany({
    where: { deletedAt: null, visibility: "public" },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(input.cursor
      ? { cursor: { id: input.cursor }, skip: 1 }
      : {}),
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      author: {
        include: {
          profile: true,
          verification: true,
        },
      },
      likes: input.viewerId
        ? { where: { userId: input.viewerId }, select: { id: true } }
        : false,
      savedBy: input.viewerId
        ? { where: { userId: input.viewerId }, select: { id: true } }
        : false,
      _count: { select: { comments: true, likes: true } },
    },
  });

  let nextCursor: string | null = null;
  if (posts.length > limit) {
    const next = posts.pop()!;
    nextCursor = next.id;
  }

  return {
    items: posts.map((p) => ({
      ...p,
      likedByMe: Array.isArray(p.likes) ? p.likes.length > 0 : false,
      savedByMe: Array.isArray(p.savedBy) ? p.savedBy.length > 0 : false,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
    })),
    nextCursor,
  };
}

export async function toggleLike(userId: string, postId: string) {
  const existing = await db.like.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    await db.$transaction([
      db.like.delete({ where: { id: existing.id } }),
      db.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    return { liked: false };
  }

  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.deletedAt) throw new Error("POST_NOT_FOUND");

  await db.$transaction([
    db.like.create({ data: { postId, userId } }),
    db.post.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    }),
  ]);

  if (post.authorId !== userId) {
    await db.notification.create({
      data: {
        userId: post.authorId,
        type: "like",
        title: "New like",
        body: "Someone liked your post",
        href: `/?post=${postId}`,
      },
    });
  }

  return { liked: true };
}

export async function toggleSave(userId: string, postId: string) {
  const existing = await db.savedPost.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) {
    await db.savedPost.delete({ where: { id: existing.id } });
    return { saved: false };
  }
  await db.savedPost.create({ data: { postId, userId } });
  return { saved: true };
}

export async function sharePost(userId: string, postId: string) {
  const post = await db.post.update({
    where: { id: postId },
    data: { shareCount: { increment: 1 } },
  });
  await writeAuditLog({
    actorUserId: userId,
    action: "post.share",
    entityType: "Post",
    entityId: postId,
  });
  return post;
}

export async function reportTarget(input: {
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
  postId?: string;
}) {
  return db.report.create({
    data: {
      reporterId: input.reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details,
      postId: input.postId,
    },
  });
}

export async function addComment(input: {
  postId: string;
  authorId: string;
  content: string;
  parentId?: string | null;
}) {
  const content = input.content.trim();
  if (!content) throw new Error("EMPTY_COMMENT");
  if (content.length > 2000) throw new Error("CONTENT_TOO_LONG");

  const post = await db.post.findUnique({ where: { id: input.postId } });
  if (!post || post.deletedAt) throw new Error("POST_NOT_FOUND");

  if (input.parentId) {
    const parent = await db.comment.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.postId !== input.postId) throw new Error("INVALID_PARENT");
  }

  const comment = await db.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: {
        postId: input.postId,
        authorId: input.authorId,
        content,
        parentId: input.parentId ?? null,
      },
      include: {
        author: { include: { profile: true } },
      },
    });
    await tx.post.update({
      where: { id: input.postId },
      data: { commentCount: { increment: 1 } },
    });
    return created;
  });

  if (post.authorId !== input.authorId) {
    await db.notification.create({
      data: {
        userId: post.authorId,
        type: input.parentId ? "reply" : "comment",
        title: input.parentId ? "New reply" : "New comment",
        body: content.slice(0, 120),
        href: `/?post=${input.postId}`,
      },
    });
  }

  return comment;
}

export async function editComment(input: {
  commentId: string;
  authorId: string;
  content: string;
}) {
  const comment = await db.comment.findUnique({ where: { id: input.commentId } });
  if (!comment || comment.deletedAt) throw new Error("NOT_FOUND");
  if (comment.authorId !== input.authorId) throw new Error("FORBIDDEN");
  return db.comment.update({
    where: { id: input.commentId },
    data: { content: input.content.trim() },
  });
}

export async function deleteComment(input: { commentId: string; authorId: string }) {
  const comment = await db.comment.findUnique({ where: { id: input.commentId } });
  if (!comment || comment.deletedAt) throw new Error("NOT_FOUND");
  if (comment.authorId !== input.authorId) throw new Error("FORBIDDEN");

  await db.$transaction([
    db.comment.update({
      where: { id: input.commentId },
      data: { deletedAt: new Date(), content: "" },
    }),
    db.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    }),
  ]);
  return { ok: true };
}

export async function toggleCommentLike(userId: string, commentId: string) {
  const existing = await db.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId } },
  });
  if (existing) {
    await db.$transaction([
      db.commentLike.delete({ where: { id: existing.id } }),
      db.comment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    return { liked: false };
  }
  await db.$transaction([
    db.commentLike.create({ data: { commentId, userId } }),
    db.comment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
    }),
  ]);
  return { liked: true };
}

export async function getComments(postId: string, viewerId?: string | null) {
  const comments = await db.comment.findMany({
    where: { postId, deletedAt: null, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { include: { profile: true } },
      likes: viewerId ? { where: { userId: viewerId } } : false,
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: { include: { profile: true } },
          likes: viewerId ? { where: { userId: viewerId } } : false,
        },
      },
    },
  });

  return comments;
}
