"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { Copy, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { setListingStatusAction } from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";
import { siteConfig } from "@/config/site";

type ListingItem = {
  publicId: string;
  title: string;
  status: string;
  views: number;
  favorites?: number;
};

export function SellerListingsClient({
  products,
  services,
  jobs = [],
  labels,
}: {
  products: ListingItem[];
  services: ListingItem[];
  jobs: { publicId: string; title: string; status: string; views: number }[];
  labels: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const router = useRouter();

  const hrefFor = (kind: "product" | "service" | "job", publicId: string) =>
    kind === "product"
      ? `/products/${publicId}`
      : kind === "service"
        ? `/services/${publicId}`
        : `/jobs/${publicId}`;

  function filterItems(items: ListingItem[]) {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (query.trim() && !item.title.toLowerCase().includes(query.trim().toLowerCase()))
        return false;
      return true;
    });
  }

  const filtered = useMemo(
    () => ({
      products: filterItems(products),
      services: filterItems(services),
      jobs: filterItems(jobs),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, services, jobs, query, statusFilter],
  );

  const total = filtered.products.length + filtered.services.length + filtered.jobs.length;

  async function copyLink(kind: "product" | "service" | "job", publicId: string) {
    await navigator.clipboard.writeText(`${siteConfig.url}/${hrefFor(kind, publicId)}`);
    toast({ title: labels.linkCopied, variant: "success" });
  }

  return (
    <div className="space-y-4">
      {/* Search & filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="h-10 w-full rounded-xl border border-input bg-card ps-9 pe-3 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-input bg-card px-3 text-sm"
        >
          <option value="all">{labels.allStatuses}</option>
          <option value="active">{labels.statusActive}</option>
          <option value="paused">{labels.statusPaused}</option>
          <option value="deleted">{labels.statusDeleted}</option>
        </select>
        <span className="text-xs text-muted-foreground">
          {total} {labels.items}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListingSection
          title={labels.products}
          items={filtered.products}
          kind="product"
          labels={labels}
          pending={pending}
          copyLink={copyLink}
          router={router}
          onAction={startTransition}
        />
        <ListingSection
          title={labels.services}
          items={filtered.services}
          kind="service"
          labels={labels}
          pending={pending}
          copyLink={copyLink}
          router={router}
          onAction={startTransition}
        />
        <div className="lg:col-span-2">
          <ListingSection
            title={labels.jobs}
            items={filtered.jobs}
            kind="job"
            labels={labels}
            pending={pending}
            copyLink={copyLink}
            router={router}
            onAction={startTransition}
          />
        </div>
      </div>
    </div>
  );
}

function ListingSection({
  title,
  items,
  kind,
  labels,
  pending,
  copyLink,
  router,
  onAction,
}: {
  title: string;
  items: ListingItem[];
  kind: "product" | "service" | "job";
  labels: Record<string, string>;
  pending: boolean;
  copyLink: (kind: "product" | "service" | "job", publicId: string) => Promise<void>;
  router: ReturnType<typeof useRouter>;
  onAction: (fn: () => Promise<void>) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          {labels.noResults}
        </p>
      ) : (
        items.map((item) => (
          <ListingRow
            key={item.publicId}
            kind={kind}
            item={item}
            labels={labels}
            pending={pending}
            copyLink={copyLink}
            router={router}
            onAction={onAction}
          />
        ))
      )}
    </div>
  );
}

function ListingRow({
  kind,
  item,
  labels,
  pending,
  copyLink,
  router,
  onAction,
}: {
  kind: "product" | "service" | "job";
  item: ListingItem;
  labels: Record<string, string>;
  pending: boolean;
  copyLink: (kind: "product" | "service" | "job", publicId: string) => Promise<void>;
  router: ReturnType<typeof useRouter>;
  onAction: (fn: () => Promise<void>) => void;
}) {
  const hrefFor = (k: "product" | "service" | "job", publicId: string) =>
    k === "product"
      ? `/products/${publicId}`
      : k === "service"
        ? `/services/${publicId}`
        : `/jobs/${publicId}`;

  return (
    <Card className="mb-2">
      <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <Link
            href={hrefFor(kind, item.publicId) as "/"}
            className="flex items-center gap-1.5 font-semibold hover:underline"
          >
            <span className="truncate">{item.title}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Link>
          <p className="text-xs text-muted-foreground">
            {item.views} views{item.favorites != null ? ` · ${item.favorites} fav` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => copyLink(kind, item.publicId)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title={labels.share}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <Badge>{item.status}</Badge>
          {item.status === "active" ? (
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              onClick={() =>
                onAction(async () => {
                  await setListingStatusAction(kind, item.publicId, "paused");
                  router.refresh();
                })
              }
            >
              {labels.pause}
            </Button>
          ) : item.status !== "deleted" ? (
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              onClick={() =>
                onAction(async () => {
                  await setListingStatusAction(kind, item.publicId, "active");
                  router.refresh();
                })
              }
            >
              {labels.activate}
            </Button>
          ) : null}
          {item.status !== "deleted" ? (
            <Button
              size="sm"
              variant="danger"
              loading={pending}
              onClick={() =>
                onAction(async () => {
                  await setListingStatusAction(kind, item.publicId, "deleted");
                  router.refresh();
                })
              }
            >
              {labels.delete}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
