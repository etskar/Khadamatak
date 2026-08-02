import { getTranslations, setRequestLocale } from "next-intl/server";
import { listGroups, ensureDefaultCities } from "@/server/marketplace/group-service";
import { PageHeader } from "@/components/shared/page-header";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users } from "lucide-react";

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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <Link key={g.id} href={`/groups/${g.slug}`}>
            <Card className="h-full transition hover:shadow-md">
              <CardContent className="space-y-2 p-5">
                <h3 className="text-lg font-bold">
                  {locale === "ar" ? g.nameAr || g.name : g.nameNl || g.name}
                </h3>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {g.city}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {g.memberCount || g._count.members} {t("members")}
                </p>
                {g.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {g.description}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
