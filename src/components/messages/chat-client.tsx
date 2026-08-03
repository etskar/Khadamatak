"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { sendMessageAction } from "@/server/actions/social-actions";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  type: string;
  content: string | null;
  payloadJson: string | null;
  senderId: string;
  createdAt: string;
  senderName: string;
  senderAvatar: string | null | undefined;
};

export function ChatClient(props: {
  conversationId: string;
  currentUserId: string;
  otherName: string;
  otherAvatar?: string | null;
  messages: Msg[];
}) {
  const t = useTranslations("messages");
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col animate-in-up lg:h-[calc(100dvh-6rem)]">
      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <Avatar src={props.otherAvatar} fallback={props.otherName} />
        <div>
          <p className="font-semibold">{props.otherName}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {props.messages.map((m) => {
          const mine = m.senderId === props.currentUserId;
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-xs",
                  mine
                    ? "bg-brand-600 text-white"
                    : "bg-muted text-foreground",
                )}
              >
                <p>{m.content ?? m.type}</p>
                <p className="mt-1 text-[10px] opacity-70">
                  {new Date(m.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            startTransition(async () => {
              await sendMessageAction(props.conversationId, text.trim());
              setText("");
              router.refresh();
            });
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("typeMessage")}
            className="h-12 flex-1 rounded-xl border border-input bg-card px-4 text-base sm:text-sm"
          />
          <Button type="submit" loading={pending}>
            {t("send")}
          </Button>
        </form>
      </div>
    </div>
  );
}
