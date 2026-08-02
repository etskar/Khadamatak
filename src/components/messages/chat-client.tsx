"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  sendMessageAction,
  sendPaymentToChatAction,
} from "@/server/actions/social-actions";
import { createPaymentRequestAction } from "@/server/actions/wallet-actions";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

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
  otherWalletId?: string | null;
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
          {props.otherWalletId ? (
            <p className="text-xs text-muted-foreground">{props.otherWalletId}</p>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {props.messages.map((m) => {
          const mine = m.senderId === props.currentUserId;
          const payload = m.payloadJson ? safeParse(m.payloadJson) : null;
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
                  m.type !== "text" && "min-w-[16rem]",
                )}
              >
                {m.type === "text" ? (
                  <p>{m.content}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase opacity-80">
                      {m.type}
                    </p>
                    <p>{m.content}</p>
                    {payload?.payPath ? (
                      <Link
                        href={payload.payPath as "/"}
                        className={cn(
                          "inline-flex rounded-lg px-3 py-1.5 text-xs font-bold",
                          mine ? "bg-white text-brand-700" : "bg-primary text-primary-foreground",
                        )}
                      >
                        {t("payNow")}
                      </Link>
                    ) : null}
                    {payload?.reference ? (
                      <p className="text-xs opacity-80">{payload.reference}</p>
                    ) : null}
                  </div>
                )}
                <p className="mt-1 text-[10px] opacity-70">
                  {new Date(m.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const fd = new FormData();
                fd.set("amount", "10");
                fd.set("description", t("requestFromChat"));
                const pr = await createPaymentRequestAction(fd);
                await sendPaymentToChatAction({
                  conversationId: props.conversationId,
                  kind: "payment_request",
                  content: t("paymentRequestContent"),
                  payload: {
                    payPath: pr.payPath,
                    publicId: pr.publicId,
                    shareToken: pr.shareToken,
                  },
                });
                router.refresh();
              })
            }
          >
            {t("sendPaymentRequest")}
          </Button>
        </div>
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
            className="h-12 flex-1 rounded-xl border border-input bg-card px-4 text-sm"
          />
          <Button type="submit" loading={pending}>
            {t("send")}
          </Button>
        </form>
      </div>
    </div>
  );
}

function safeParse(value: string) {
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return null;
  }
}
