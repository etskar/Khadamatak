"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  addComment,
  createPost,
  deleteComment,
  editComment,
  getComments,
  getFeed,
  reportTarget,
  sharePost,
  toggleCommentLike,
  toggleLike,
  toggleSave,
} from "@/server/social/post-service";
import { searchAll, clearSearchHistory } from "@/server/social/search-service";
import {
  getOrCreateConversation,
  sendMessage,
} from "@/server/social/message-service";
import { db } from "@/lib/db";
import { siteConfig } from "@/config/site";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user;
}

export async function createPostAction(formData: FormData) {
  const user = await requireUser();
  const content = String(formData.get("content") ?? "");
  const mediaJson = String(formData.get("media") ?? "[]");
  let media: { type: "image" | "video"; url: string }[] = [];
  try {
    media = JSON.parse(mediaJson);
  } catch {
    media = [];
  }

  const post = await createPost({ authorId: user.id, content, media });
  revalidatePath("/");
  return { ok: true as const, postId: post.id };
}

export async function fetchFeedAction(cursor?: string | null) {
  const session = await auth();
  return getFeed({ viewerId: session?.user?.id, cursor });
}

export async function likePostAction(postId: string) {
  const user = await requireUser();
  const result = await toggleLike(user.id, postId);
  revalidatePath("/");
  return result;
}

export async function savePostAction(postId: string) {
  const user = await requireUser();
  const result = await toggleSave(user.id, postId);
  revalidatePath("/");
  revalidatePath("/profile");
  return result;
}

export async function sharePostAction(postId: string) {
  const user = await requireUser();
  await sharePost(user.id, postId);
  const appUrl = siteConfig.url;
  return { ok: true as const, url: `${appUrl}/?post=${postId}` };
}

export async function reportPostAction(postId: string, reason: string) {
  const user = await requireUser();
  await reportTarget({
    reporterId: user.id,
    targetType: "post",
    targetId: postId,
    reason,
    postId,
  });
  return { ok: true as const };
}

export async function addCommentAction(
  postId: string,
  content: string,
  parentId?: string | null,
) {
  const user = await requireUser();
  const comment = await addComment({
    postId,
    authorId: user.id,
    content,
    parentId,
  });
  revalidatePath("/");
  return { ok: true as const, comment };
}

export async function editCommentAction(commentId: string, content: string) {
  const user = await requireUser();
  await editComment({ commentId, authorId: user.id, content });
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteCommentAction(commentId: string) {
  const user = await requireUser();
  await deleteComment({ commentId, authorId: user.id });
  revalidatePath("/");
  return { ok: true as const };
}

export async function likeCommentAction(commentId: string) {
  const user = await requireUser();
  return toggleCommentLike(user.id, commentId);
}

export async function getCommentsAction(postId: string) {
  const session = await auth();
  return getComments(postId, session?.user?.id);
}

export async function searchAction(query: string) {
  const session = await auth();
  return searchAll({ query, userId: session?.user?.id });
}

export async function clearSearchAction() {
  const user = await requireUser();
  await clearSearchHistory(user.id);
  revalidatePath("/search");
  return { ok: true as const };
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  return { ok: true as const };
}

export async function startConversationAction(otherUserId: string) {
  const user = await requireUser();
  const conversation = await getOrCreateConversation(user.id, otherUserId);
  return { ok: true as const, conversationId: conversation.id };
}

export async function sendMessageAction(
  conversationId: string,
  content: string,
) {
  const user = await requireUser();
  const message = await sendMessage({
    conversationId,
    senderId: user.id,
    content,
  });
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true as const, message };
}
