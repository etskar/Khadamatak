"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search as SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { searchAction, clearSearchAction } from "@/server/actions/social-actions";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

type Result = Awaited<ReturnType<typeof searchAction>>;

export function SearchClient({
  recent,
}: {
  recent: { id: string; query: string }[];
}) {
  const t = useTranslations("search");
  const [q, setQ] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!value.trim()) {
        setResult(null);
        return;
      }
      startTransition(async () => {
        const res = await searchAction(value.trim());
        setResult(res);
      });
    }, 250);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("title")} />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          debouncedSearch(e.target.value);
        }}
        placeholder={t("placeholder")}
        leftIcon={<SearchIcon className="h-4 w-4" />}
        containerClassName="mb-4"
      />

      {!result && recent.length > 0 ? (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">{t("recent")}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  await clearSearchAction();
                  router.refresh();
                })
              }
            >
              {t("clear")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <button
                key={r.id}
                type="button"
                className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium"
                onClick={() => {
                  setQ(r.query);
                  debouncedSearch(r.query);
                }}
              >
                {r.query}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {pending ? (
        <p className="text-sm text-muted-foreground">{t("searching")}</p>
      ) : null}

      {result ? (
        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">{t("users")}</h3>
            {result.users.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="space-y-2">
                {result.users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.username}`}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 hover:bg-muted/40"
                  >
                    <Avatar src={u.avatarUrl} fallback={u.displayName} />
                    <div>
                      <p className="font-semibold">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">{t("posts")}</h3>
            {result.posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="space-y-2">
                {result.posts.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <p className="font-medium">
                      @{p.author.profile?.username}
                    </p>
                    <p className="text-muted-foreground line-clamp-2">{p.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">{t("products")}</h3>
            {result.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="space-y-2">
                {result.products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.publicId}`}
                    className="block rounded-xl border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.city}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">{t("services")}</h3>
            {result.services.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="space-y-2">
                {result.services.map((s) => (
                  <Link
                    key={s.id}
                    href={`/services/${s.publicId}`}
                    className="block rounded-xl border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.city}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">{t("groups")}</h3>
            {result.groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="space-y-2">
                {result.groups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/groups/${g.slug}`}
                    className="block rounded-xl border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.city}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">{t("requests")}</h3>
            {result.requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="space-y-2">
                {result.requests.map((r) => (
                  <Link
                    key={r.id}
                    href={`/requests/${r.publicId}`}
                    className="block rounded-xl border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <p className="font-semibold">{r.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {r.description}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        !pending && (
          <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
        )
      )}
    </div>
  );
}
