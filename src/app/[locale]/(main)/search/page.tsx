import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getRecentSearches } from "@/server/social/search-service";
import { SearchClient } from "@/components/search/search-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return { title: t("title") };
}

export default async function SearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  const recent = session?.user?.id
    ? await getRecentSearches(session.user.id)
    : [];

  return (
    <SearchClient
      recent={recent.map((r) => ({ id: r.id, query: r.query }))}
    />
  );
}
