import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getMessages } from "@/server/social/message-service";
import { ChatClient } from "@/components/messages/chat-client";
import { db } from "@/lib/db";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  let data;
  try {
    data = await getMessages(id, session.user.id);
  } catch {
    notFound();
  }

  const otherId =
    data.conversation.userAId === session.user.id
      ? data.conversation.userBId
      : data.conversation.userAId;
  const other = await db.user.findUnique({
    where: { id: otherId },
    include: { profile: true, wallet: true },
  });

  return (
    <ChatClient
      conversationId={id}
      currentUserId={session.user.id}
      otherName={other?.profile?.displayName ?? "User"}
      otherAvatar={other?.profile?.avatarUrl}
      otherWalletId={other?.wallet?.walletId}
      messages={data.messages.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        payloadJson: m.payloadJson,
        senderId: m.senderId,
        createdAt: m.createdAt.toISOString(),
        senderName: m.sender.profile?.displayName ?? "User",
        senderAvatar: m.sender.profile?.avatarUrl,
      }))}
    />
  );
}
