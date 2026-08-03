"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Send,
  ShoppingBag,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/marketplace/listing-card";
import { Link } from "@/i18n/navigation";
import {
  createGroupPostAction,
  joinGroupAction,
} from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";
import { getFriendlyError } from "@/lib/friendly-errors";
import { cn } from "@/lib/utils";

type Tab = "posts" | "products" | "services" | "jobs" | "members" | "about";

type ChatPost = {
  id: string;
  content: string;
  type: string;
  mediaJson: string | null;
  payloadJson: string | null;
  authorId: string;
  author: string;
  authorUsername: string;
  authorAvatar: string | null;
  createdAt: string;
};

type ListingChoice =
  | { kind: "product"; publicId: string; title: string; priceLabel: string | null; imageUrl: string | null }
  | { kind: "service"; publicId: string; title: string; priceLabel: string | null; imageUrl: string | null }
  | { kind: "job"; publicId: string; title: string; company: string };

type MediaItem = { type: "image" | "video" | "audio"; url: string };

export function GroupDetailClient(props: {
  slug: string;
  currentUserId: string | null;
  name: string;
  city: string;
  description: string | null;
  memberStatus: string | null;
  requiresVerification: boolean;
  members: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
    verified: boolean;
  }[];
  posts: ChatPost[];
  products: {
    publicId: string;
    title: string;
    priceLabel: string | null;
    imageUrl: string | null;
    city: string | null;
  }[];
  services: {
    publicId: string;
    title: string;
    priceLabel: string | null;
    imageUrl: string | null;
    city: string | null;
  }[];
  jobs: {
    publicId: string;
    title: string;
    company: string;
    city: string | null;
    employmentType: string;
    salaryMinCents: number | null;
    salaryMaxCents: number | null;
    currency: string;
    salaryPeriod: string;
    imageUrl: string | null;
  }[];
  labels: Record<string, string>;
}) {
  const [tab, setTab] = useState<Tab>("posts");
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const router = useRouter();
  const tCommon = useTranslations("common");
  const isMember = props.memberStatus === "active";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.posts.length, tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "posts", label: props.labels.posts },
    { key: "products", label: props.labels.products },
    { key: "services", label: props.labels.services },
    { key: "jobs", label: props.labels.jobs },
    { key: "members", label: props.labels.members },
    { key: "about", label: props.labels.about },
  ];

  function uploadAndSend(file: File, type: "image" | "video" | "audio", fallbackText: string) {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("slug", props.slug);
        fd.set("type", type === "audio" ? "voice" : "media");
        fd.set("content", fallbackText);
        fd.append("media", file);
        await createGroupPostAction(fd);
        router.refresh();
      } catch (e) {
        toast({
          title: getFriendlyError(e, tCommon),
          variant: "danger",
        });
      }
    });
  }

  function sendText() {
    if (!text.trim()) return;
    const value = text.trim();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("slug", props.slug);
      fd.set("type", "text");
      fd.set("content", value);
      for (const m of mediaFiles) {
        const res = await fetch(m.url);
        const blob = await res.blob();
        const file = new File([blob], "media", { type: blob.type });
        fd.append("media", file);
      }
      if (attachedFile) {
        const res = await fetch(attachedFile.url);
        const blob = await res.blob();
        const file = new File([blob], attachedFile.name, { type: blob.type });
        fd.append("file", file);
      }
      await createGroupPostAction(fd);
      setText("");
      setMediaFiles([]);
      setAttachedFile(null);
      router.refresh();
    });
  }

  function sendListing(choice: ListingChoice) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("slug", props.slug);
      fd.set("type", "listing");
      fd.set("content", choice.title);
      fd.set(
        "payload",
        JSON.stringify({ listing: choice }),
      );
      await createGroupPostAction(fd);
      setShareOpen(false);
      router.refresh();
    });
  }

  const listingChoices: ListingChoice[] = [
    ...props.products.map((p) => ({
      kind: "product" as const,
      publicId: p.publicId,
      title: p.title,
      priceLabel: p.priceLabel,
      imageUrl: p.imageUrl,
    })),
    ...props.services.map((s) => ({
      kind: "service" as const,
      publicId: s.publicId,
      title: s.title,
      priceLabel: s.priceLabel,
      imageUrl: s.imageUrl,
    })),
    ...props.jobs.map((j) => ({
      kind: "job" as const,
      publicId: j.publicId,
      title: j.title,
      company: j.company,
    })),
  ];

  function parsePayload(json: string | null): {
    listing?: ListingChoice;
    file?: { url: string; name: string; size: number };
  } | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function parseMedia(json: string | null): {
    items: MediaItem[];
    file: { url: string; name: string; size: number } | null;
  } {
    if (!json) return { items: [], file: null };
    try {
      const parsed = JSON.parse(json);
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.media)
          ? parsed.media
          : [];
      return { items, file: parsed.file ?? null };
    } catch {
      return { items: [], file: null };
    }
  }

  function renderMessage(p: ChatPost) {
    const mine = p.authorId === props.currentUserId;
    const payload = parsePayload(p.payloadJson);
    const { items: media, file } = parseMedia(p.mediaJson);
    const listing = payload?.listing;
    const fileInfo = file ?? payload?.file;
    const time = new Date(p.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div
        key={p.id}
        className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}
      >
        {!mine ? (
          <Link href={`/profile/${p.authorUsername}`} className="shrink-0">
            <Avatar src={p.authorAvatar} fallback={p.author} size="sm" />
          </Link>
        ) : null}
        <div
          className={cn(
            "max-w-[78%] space-y-1.5 rounded-2xl px-3.5 py-2.5 text-sm shadow-xs",
            mine
              ? "rounded-br-md bg-brand-600 text-white"
              : "rounded-bl-md bg-muted text-foreground",
          )}
        >
          {!mine ? (
            <p className="text-[11px] font-semibold opacity-80">{p.author}</p>
          ) : null}

          {p.type === "listing" && listing ? (
            <Link
              href={
                listing.kind === "product"
                  ? `/products/${listing.publicId}`
                  : listing.kind === "service"
                    ? `/services/${listing.publicId}`
                    : `/jobs/${listing.publicId}`
              }
              className={cn(
                "flex items-center gap-2.5 rounded-xl p-2",
                mine ? "bg-white/15" : "bg-card border border-border",
              )}
            >
              {listing.kind !== "job" && listing.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.imageUrl}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    mine ? "bg-white/20" : "bg-muted",
                  )}
                >
                  <ShoppingBag className="h-5 w-5" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-semibold">{listing.title}</span>
                <span className="block truncate text-[11px] opacity-80">
                  {listing.kind === "job"
                    ? listing.company
                    : listing.priceLabel ?? listing.kind}
                </span>
              </span>
            </Link>
          ) : null}

          {p.type === "media" || (media.length > 0 && p.type !== "listing") ? (
            <div className="space-y-1.5">
              {media.map((m, i) =>
                m.type === "video" ? (
                  <video
                    key={i}
                    src={m.url}
                    controls
                    className="max-h-64 w-full rounded-lg"
                  />
                ) : m.type === "audio" ? (
                  <audio key={i} src={m.url} controls className="w-56" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={m.url}
                    alt=""
                    className="max-h-64 w-full rounded-lg object-cover"
                  />
                ),
              )}
            </div>
          ) : null}

          {fileInfo ? (
            <a
              href={fileInfo.url}
              download={fileInfo.name}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium",
                mine ? "bg-white/15" : "bg-muted",
              )}
            >
              <Paperclip className="h-4 w-4" />
              {fileInfo.name}
            </a>
          ) : null}

          {p.type === "text" && p.content ? (
            <p className="whitespace-pre-wrap leading-relaxed">{p.content}</p>
          ) : null}

          <p className={cn("text-[10px]", mine ? "text-white/70" : "text-muted-foreground")}>
            {time}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in-up">
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{props.name}</h1>
            <p className="text-sm text-muted-foreground">{props.city}</p>
            {props.requiresVerification ? (
              <Badge className="mt-2" variant="secondary">
                {props.labels.verifiedMembers}
              </Badge>
            ) : null}
          </div>
          {!isMember ? (
            <Button
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await joinGroupAction(props.slug);
                    toast({ title: tCommon("success"), variant: "success" });
                    router.refresh();
                  } catch (e) {
                    toast({
                      title: getFriendlyError(e, tCommon),
                      variant: "danger",
                    });
                  }
                })
              }
            >
              {props.labels.join}
            </Button>
          ) : (
            <Badge variant="success">{props.labels.member}</Badge>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border bg-card p-1 no-scrollbar">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-sm font-semibold",
              tab === item.key
                ? "bg-brand-50 text-brand-700 dark:bg-brand-800/30"
                : "text-muted-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "posts" ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex h-[520px] flex-col">
              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {props.posts.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    {props.labels.emptyChat}
                  </p>
                ) : (
                  props.posts.map(renderMessage)
                )}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              {isMember ? (
                <div className="border-t border-border p-3">
                  {mediaFiles.length > 0 || attachedFile ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {mediaFiles.map((m, i) =>
                        m.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={m.url}
                            alt=""
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <span
                            key={i}
                            className="inline-flex h-16 w-16 items-center justify-center rounded-lg bg-muted"
                          >
                            {m.type === "video" ? (
                              <Video className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Mic className="h-5 w-5 text-muted-foreground" />
                            )}
                          </span>
                        ),
                      )}
                      {attachedFile ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium">
                          <FileText className="h-4 w-4" />
                          {attachedFile.name}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {shareOpen ? (
                    <div className="mb-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border bg-muted/40 p-2">
                      <p className="px-2 pb-1 text-[11px] font-semibold text-muted-foreground">
                        {props.labels.chooseListing}
                      </p>
                      {listingChoices.length === 0 ? (
                        <p className="px-2 text-xs text-muted-foreground">â€”</p>
                      ) : (
                        listingChoices.map((c) => (
                          <button
                            key={`${c.kind}-${c.publicId}`}
                            type="button"
                            onClick={() => sendListing(c)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-muted"
                          >
                            <ShoppingBag className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{c.title}</span>
                            <span className="ms-auto text-[10px] uppercase text-muted-foreground">
                              {c.kind}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}

                  <div className="flex items-end gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setAttachedFile({ name: f.name, url: URL.createObjectURL(f) });
                        }
                        e.target.value = "";
                      }}
                    />
                    <input
                      ref={mediaInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setMediaFiles((m) => [
                            ...m,
                            { type: "image", url: URL.createObjectURL(f) },
                          ]);
                          uploadAndSend(f, "image", "ðŸ“·");
                        }
                        e.target.value = "";
                      }}
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setMediaFiles((m) => [
                            ...m,
                            { type: "video", url: URL.createObjectURL(f) },
                          ]);
                          uploadAndSend(f, "video", "ðŸŽ¬");
                        }
                        e.target.value = "";
                      }}
                    />
                    <input
                      ref={voiceInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setMediaFiles((m) => [
                            ...m,
                            { type: "audio", url: URL.createObjectURL(f) },
                          ]);
                          uploadAndSend(f, "audio", "ðŸŽ¤");
                        }
                        e.target.value = "";
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => mediaInputRef.current?.click()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted"
                      title={props.labels.attachImage}
                    >
                      <ImageIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted"
                      title={props.labels.attachVideo}
                    >
                      <Video className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => voiceInputRef.current?.click()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted"
                      title={props.labels.attachVoice}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted"
                      title={props.labels.attachFile}
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareOpen((v) => !v)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted"
                      title={props.labels.shareListing}
                    >
                      <ShoppingBag className="h-5 w-5" />
                    </button>

                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendText();
                        }
                      }}
                      placeholder={props.labels.chatPlaceholder}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-card px-3.5 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={sendText}
                      loading={pending}
                      className="h-10 w-10 shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-border p-4 text-center text-sm text-muted-foreground">
                  {props.labels.joinToChat}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "products" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {props.products.map((p) => (
            <ListingCard
              key={p.publicId}
              href={`/products/${p.publicId}`}
              title={p.title}
              priceLabel={p.priceLabel}
              imageUrl={p.imageUrl}
              city={p.city}
            />
          ))}
        </div>
      ) : null}

      {tab === "services" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {props.services.map((s) => (
            <ListingCard
              key={s.publicId}
              href={`/services/${s.publicId}`}
              title={s.title}
              priceLabel={s.priceLabel}
              imageUrl={s.imageUrl}
              city={s.city}
            />
          ))}
        </div>
      ) : null}

      {tab === "jobs" ? (
        <div className="space-y-2">
          {props.jobs.map((j) => (
            <Link key={j.publicId} href={`/jobs/${j.publicId}`}>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted font-bold text-muted-foreground">
                    {j.company.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{j.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {j.company}
                      {j.city ? ` Â· ${j.city}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      {tab === "members" ? (
        <div className="space-y-2">
          {props.members.map((m) => (
            <Link
              key={m.id}
              href={`/profile/${m.username}`}
              className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2"
            >
              <Avatar src={m.avatarUrl} fallback={m.name} />
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-xs text-muted-foreground">@{m.username}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {tab === "about" ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            {props.description || "â€”"}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

