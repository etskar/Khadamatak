import { getTranslations, setRequestLocale } from "next-intl/server";
import { listGroups, ensureDefaultCities } from "@/server/marketplace/group-service";
import { PageHeader } from "@/components/shared/page-header";
import { Link } from "@/i18n/navigation";
import { MapPin, Users, MessageCircle, ShieldCheck } from "lucide-react";

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  await ensureDefaultCities();
  const groups = await listGroups();

  return (
    <div className="animate-in-up">
      <PageHeader title={t("groups")} description={t("groupsSubtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <Link key={g.id} href={`/groups/${g.slug}`}>
            <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]">
              <div
                className="h-28 bg-cover bg-center sm:h-32"
                style={
                  g.coverUrl
                    ? { backgroundImage: `url(${g.coverUrl})` }
                    : {
                        backgroundImage:
                          "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))",
                      }
                }
              >
                <div className="flex h-full items-end p-4">
                  <div className="flex items-center gap-2">
                    {g.requiresVerification ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        <ShieldCheck className="h-3 w-3" />
                        {t("verifiedMembers")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold leading-tight">
                    {locale === "ar"
                      ? g.nameAr || g.name
                      : g.nameNl || g.name}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    {g.city}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    <strong>{g._count.members}</strong> {t("members")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    <strong>{g._count.groupPosts}</strong> {t("posts")}
                  </span>
                </div>

                {g.description ? (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
                    {g.description}
                  </p>
                ) : null}
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
