import "server-only";
import { db } from "@/lib/db";

function pairIds(a: string, b: string) {
  return a < b ? ([a, b] as const) : ([b, a] as const);
}

export async function getOrCreateConversation(userId: string, otherUserId: string) {
  if (userId === otherUserId) throw new Error("INVALID_USER");
  const [userAId, userBId] = pairIds(userId, otherUserId);

  const existing = await db.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (existing) return existing;

  return db.conversation.create({
    data: { userAId, userBId },
  });
}

export async function listConversations(userId: string) {
  const items = await db.conversation.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userA: { include: { profile: true } },
      userB: { include: { profile: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return items.map((c) => {
    const other = c.userAId === userId ? c.userB : c.userA;
    return {
      id: c.id,
      other,
      lastMessage: c.messages[0] ?? null,
      lastMessageAt: c.lastMessageAt,
    };
  });
}

export async function getMessages(conversationId: string, userId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) throw new Error("NOT_FOUND");
  if (conversation.userAId !== userId && conversation.userBId !== userId) {
    throw new Error("FORBIDDEN");
  }

  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { include: { profile: true } },
    },
  });

  await db.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return { conversation, messages };
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  content?: string;
  type?: string;
  payload?: Record<string, unknown>;
}) {
  const conversation = await db.conversation.findUnique({
    where: { id: input.conversationId },
  });
  if (!conversation) throw new Error("NOT_FOUND");
  if (
    conversation.userAId !== input.senderId &&
    conversation.userBId !== input.senderId
  ) {
    throw new Error("FORBIDDEN");
  }

  const message = await db.message.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      type: input.type ?? "text",
      content: input.content ?? null,
      payloadJson: input.payload ? JSON.stringify(input.payload) : null,
    },
    include: {
      sender: { include: { profile: true } },
    },
  });

  await db.conversation.update({
    where: { id: input.conversationId },
    data: { lastMessageAt: new Date() },
  });

  const recipientId =
    conversation.userAId === input.senderId
      ? conversation.userBId
      : conversation.userAId;

  await db.notification.create({
    data: {
      userId: recipientId,
      type: "message",
      title: "New message",
      body: input.content?.slice(0, 120) ?? input.type ?? "Message",
      href: `/messages/${conversation.id}`,
    },
  });

  return message;
}
