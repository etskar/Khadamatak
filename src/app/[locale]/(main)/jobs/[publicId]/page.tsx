import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { haversineKm } from "@/server/marketplace/location";
import { getJobByPublicId } from "@/server/marketplace/job-service";
import { JobDetailClient } from "@/components/marketplace/job-detail-client";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const session = await auth();
  const job = await getJobByPublicId(publicId, session?.user?.id);
  if (!job) notFound();

  const userLoc = session?.user?.id
    ? await db.userLocation.findUnique({ where: { userId: session.user.id } })
    : null;

  const distanceKm =
    userLoc?.latitude != null &&
    userLoc?.longitude != null &&
    job.latitude != null &&
    job.longitude != null
      ? haversineKm(
          userLoc.latitude,
          userLoc.longitude,
          job.latitude,
          job.longitude,
        )
      : null;

  return (
    <JobDetailClient
      job={{
        publicId: job.publicId,
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        salaryMinCents: job.salaryMinCents,
        salaryMaxCents: job.salaryMaxCents,
        currency: job.currency,
        salaryPeriod: job.salaryPeriod,
        employmentType: job.employmentType,
        workHours: job.workHours,
        applyMethod: job.applyMethod,
        applyUrl: job.applyUrl,
        applyEmail: job.applyEmail,
        city: job.city,
        country: job.country,
        latitude: job.latitude,
        longitude: job.longitude,
        viewsCount: job.viewsCount,
        media: job.media.map((m) => ({ id: m.id, type: m.type, url: m.url })),
        employer: {
          id: job.employer.id,
          name: job.employer.profile?.displayName ?? "Employer",
          username: job.employer.profile?.username ?? "",
          avatarUrl: job.employer.profile?.avatarUrl,
          verified: job.employer.verification?.status === "verified",
        },
        isOwner: session?.user?.id === job.employerId,
        publishedAt: job.publishedAt?.toISOString() ?? job.createdAt.toISOString(),
        travel:
          distanceKm != null && userLoc?.latitude != null && userLoc.longitude != null
            ? {
                originLat: userLoc.latitude,
                originLng: userLoc.longitude,
                destLat: job.latitude ?? 0,
                destLng: job.longitude ?? 0,
                distanceKm,
              }
            : null,
      }}
      labels={{
        apply: t("applyNow"),
        contact: t("contactEmployer"),
        share: t("share"),
        report: t("report"),
        verified: t("verified"),
        views: t("views"),
        location: t("location"),
        salary: t("salary"),
        employmentType: t("employmentType"),
        workHours: t("workHours"),
        requirements: t("requirements"),
        applyMethod: t("applyMethod"),
        loginRequired: t("loginRequired"),
        noMedia: t("noMedia"),
        travelTime: t("travelTime"),
        directions: t("directions"),
        viewOnMap: t("viewOnMap"),
        minutesShort: t("minutesShort"),
      }}
    />
  );
}
