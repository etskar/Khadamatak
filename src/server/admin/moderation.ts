import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listContent(input: {
  kind: "post" | "comment" | "review";
  query?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));

  if (input.kind === "post") {
    const where: Record<string, unknown> = input.query ? { content: { contains: input.query } } : {};
    const [items, total] = await Promise.all([
      db.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } },
          media: true,
          _count: { select: { likes: true, comments: true } },
        },
      }),
      db.post.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  if (input.kind === "comment") {
    const where: Record<string, unknown> = input.query ? { content: { contains: input.query } } : {};
    const [items, total] = await Promise.all([
      db.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } },
          post: { select: { id: true, content: true } },
        },
      }),
      db.comment.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  const where: Record<string, unknown> = input.query ? { content: { contains: input.query } } : {};
  const [items, total] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } },
        subject: { include: { profile: { select: { displayName: true, username: true } } } },
        order: { select: { publicId: true } },
      },
    }),
    db.review.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function moderateContent(input: {
  adminId: string;
  kind: "post" | "comment" | "review" | "group_post";
  id: string;
  action: "hide" | "restore" | "delete";
  note?: string;
}) {
  const modelMap = {
    post: db.post,
    comment: db.comment,
    review: db.review,
    group_post: db.groupPost,
  } as const;

  const existing = await (
    modelMap[input.kind] as unknown as { findUnique: (args: { where: { id: string } }) => Promise<{ id: string; hiddenAt: Date | null; deletedAt: Date | null } | null> }
  ).findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("NOT_FOUND");

  let data: Record<string, unknown> = {};
  if (input.action === "hide") data = { hiddenAt: new Date() };
  if (input.action === "restore") data = { hiddenAt: null, deletedAt: null };
  if (input.action === "delete") data = { hiddenAt: new Date(), deletedAt: new Date() };

  await (
    modelMap[input.kind] as unknown as { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> }
  ).update({
    where: { id: input.id },
    data,
  });

  await writeAdminAudit({
    adminId: input.adminId,
    action: `moderation.${input.kind}.${input.action}`,
    entityType: input.kind === "post" ? "Post" : input.kind === "comment" ? "Comment" : input.kind === "review" ? "Review" : "GroupPost",
    entityId: input.id,
    newValue: { note: input.note },
  });
  return { ok: true };
}

export async function togglePostCommentsLock(input: {
  adminId: string;
  postId: string;
}) {
  const post = await db.post.findUnique({ where: { id: input.postId } });
  if (!post) throw new Error("POST_NOT_FOUND");
  const next = !post.commentsLocked;
  await db.post.update({ where: { id: post.id }, data: { commentsLocked: next } });
  await writeAdminAudit({
    adminId: input.adminId,
    action: next ? "moderation.comments_locked" : "moderation.comments_unlocked",
    entityType: "Post",
    entityId: post.id,
  });
  return { ok: true, commentsLocked: next };
}
