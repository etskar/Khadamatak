"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/marketplace/listing-card";
import { Link } from "@/i18n/navigation";
import {
  createGroupPostAction,
  joinGroupAction,
} from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Tab = "posts" | "products" | "services" | "requests" | "members" | "about";

export function GroupDetailClient(props: {
  slug: string;
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
  posts: { id: string; content: string; author: string; createdAt: string }[];
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
  requests: { publicId: string; title: string; description: string }[];
  labels: Record<string, string>;
}) {
  const [tab, setTab] = useState<Tab>("posts");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const tCommon = useTranslations("common");
  const isMember = props.memberStatus === "active";

  const tabs: { key: Tab; label: string }[] = [
    { key: "posts", label: props.labels.posts },
    { key: "products", label: props.labels.products },
    { key: "services", label: props.labels.services },
    { key: "requests", label: props.labels.requests },
    { key: "members", label: props.labels.members },
    { key: "about", label: props.labels.about },
  ];

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
                      title: e instanceof Error ? e.message : tCommon("error"),
                      variant: "danger",
                    });
                  }
                })
              }
            >
              {props.labels.join}
            </Button>
          ) : (
            <Badge variant="success">Member</Badge>
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
        <div className="space-y-3">
          {isMember ? (
            <form
              className="space-y-2 rounded-2xl border bg-card p-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("slug", props.slug);
                startTransition(async () => {
                  await createGroupPostAction(fd);
                  e.currentTarget.reset();
                  router.refresh();
                });
              }}
            >
              <Textarea name="content" placeholder={props.labels.writePost} required />
              <Button type="submit" loading={pending}>
                {props.labels.publish}
              </Button>
            </form>
          ) : null}
          {props.posts.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold">{p.author}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{p.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
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

      {tab === "requests" ? (
        <div className="space-y-2">
          {props.requests.map((r) => (
            <Link key={r.publicId} href={`/requests/${r.publicId}`}>
              <Card>
                <CardContent className="p-4">
                  <p className="font-semibold">{r.title}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {r.description}
                  </p>
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
            {props.description || "—"}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
