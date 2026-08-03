import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listJobs } from "@/server/marketplace/job-service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Briefcase, PlusCircle } from "lucide-react";
import { PrimaryAction } from "@/components/ui/primary-action";
import { JobCard } from "@/components/marketplace/job-card";
import { JobsFilters } from "@/components/marketplace/jobs-filters";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketplace" });
  return { title: t("jobs") };
}

export default async function JobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const session = await auth();

  const categories = await db.category.findMany({
    where: { kind: "service" },
    orderBy: { sortOrder: "asc" },
  });

  const userLoc = session?.user?.id
    ? await db.userLocation.findUnique({ where: { userId: session.user.id } })
    : null;

  const feed = await listJobs({
    q: sp.q,
    categoryId: sp.category,
    city: sp.city,
    employmentType: sp.type,
    salaryMin: sp.min ? Math.round(Number(sp.min) * 100) : undefined,
    salaryMax: sp.max ? Math.round(Number(sp.max) * 100) : undefined,
    verifiedOnly: sp.verified === "1",
    lat: userLoc?.latitude ?? undefined,
    lng: userLoc?.longitude ?? undefined,
    radiusKm: sp.radius ? Number(sp.radius) : undefined,
  });

  return (
    <div className="animate-in-up">
      <PageHeader
        title={t("jobs")}
        description={t("jobsSubtitle")}
        actions={
          <PrimaryAction href="/sell/job" icon={PlusCircle} label={t("postJob")} />
        }
      />
      <JobsFilters
        categories={categories.map((c) => ({
          id: c.id,
          label: locale === "ar" ? c.nameAr : c.nameNl,
        }))}
        initial={{
          q: sp.q ?? "",
          category: sp.category ?? "",
          city: sp.city ?? "",
          type: sp.type ?? "",
        }}
      />
      {feed.items.length === 0 ? (
        <EmptyState icon={Briefcase} title={t("noJobs")} description={t("noJobsDesc")} />
      ) : (
        <div className="mt-4 space-y-3">
          {feed.items.map((j) => (
            <JobCard
              key={j.id}
              href={`/jobs/${j.publicId}`}
              title={j.title}
              company={j.company}
              city={j.city}
              employmentType={j.employmentType}
              salaryMinCents={j.salaryMinCents}
              salaryMaxCents={j.salaryMaxCents}
              currency={j.currency}
              salaryPeriod={j.salaryPeriod}
              imageUrl={j.media[0]?.url ?? null}
              verified={j.employer.verification?.status === "verified"}
              distanceLabel={
                j.distanceKm != null ? `${j.distanceKm.toFixed(1)} km` : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
