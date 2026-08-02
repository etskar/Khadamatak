import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listConversations } from "@/server/social/message-service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ar, nl } from "date-fns/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "messages" });
  return { title: t("title") };
}

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("messages");
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/messages`);
  }

  const conversations = await listConversations(session.user.id);
  const dateLocale = locale === "ar" ? ar : nl;

  return (
    <div className="animate-in-up">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title={t("title")} />
        <Link
          href="/search"
          className="inline-flex h-9 shrink-0 items-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
        >
          {t("compose")}
        </Link>
      </div>
      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition hover:bg-muted/40"
            >
              <Avatar
                src={c.other.profile?.avatarUrl}
                fallback={c.other.profile?.displayName ?? "U"}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold">
                    {c.other.profile?.displayName ?? "User"}
                  </p>
                  {c.lastMessage?.createdAt ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(
                        new Date(c.lastMessage.createdAt),
                        { addSuffix: true, locale: dateLocale },
                      )}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {c.lastMessage?.content ?? c.lastMessage?.type ?? "—"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
