import "server-only";
import { db } from "@/lib/db";
import { createJobPublicId } from "@/lib/ids";
import { writeAuditLog } from "@/lib/audit";
import { assertVerifiedSeller } from "./guards";
import { boundingBox, haversineKm } from "./location";

export async function listJobs(input: {
  q?: string;
  categoryId?: string;
  city?: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  verifiedOnly?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  cursor?: string | null;
  limit?: number;
}) {
  const limit = Math.min(input.limit ?? 20, 50);
  let geoFilter:
    | { latitude: { gte: number; lte: number }; longitude: { gte: number; lte: number } }
    | undefined;

  if (
    input.lat != null &&
    input.lng != null &&
    input.radiusKm != null &&
    input.radiusKm > 0
  ) {
    const box = boundingBox(input.lat, input.lng, input.radiusKm);
    geoFilter = {
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
    };
  }

  const items = await db.job.findMany({
    where: {
      status: "active",
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q } },
              { description: { contains: input.q } },
              { company: { contains: input.q } },
              { city: { contains: input.q } },
            ],
          }
        : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.city ? { city: { contains: input.city } } : {}),
      ...(input.employmentType ? { employmentType: input.employmentType } : {}),
      ...(input.salaryMin != null || input.salaryMax != null
        ? {
            OR: [
              { salaryMaxCents: { gte: input.salaryMin ?? 0 } },
              { salaryMinCents: { lte: input.salaryMax ?? 2_147_483_647 } },
            ],
          }
        : {}),
      ...(geoFilter ?? {}),
      ...(input.verifiedOnly
        ? { employer: { verification: { status: "verified" } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      category: true,
      employer: {
        include: {
          profile: { select: { displayName: true, username: true, avatarUrl: true } },
          verification: true,
        },
      },
    },
  });

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null;

  const withDistance =
    input.lat != null && input.lng != null
      ? pageItems
          .map((j) => ({
            ...j,
            distanceKm:
              j.latitude != null && j.longitude != null
                ? haversineKm(input.lat!, input.lng!, j.latitude, j.longitude)
                : null,
          }))
          .filter(
            (j) =>
              input.radiusKm == null ||
              j.distanceKm == null ||
              j.distanceKm <= input.radiusKm,
          )
          .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
      : pageItems.map((j) => ({ ...j, distanceKm: null as number | null }));

  return { items: withDistance, nextCursor };
}

export async function getJobByPublicId(publicId: string, _viewerId?: string | null) {
  const job = await db.job.findUnique({
    where: { publicId },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      category: true,
      employer: {
        include: {
          profile: true,
          verification: true,
        },
      },
    },
  });
  if (!job || job.status === "deleted") return null;

  await db.job.update({
    where: { id: job.id },
    data: { viewsCount: { increment: 1 } },
  });

  return { ...job, viewsCount: job.viewsCount + 1 };
}

export async function createJob(input: {
  employerId: string;
  title: string;
  company: string;
  description: string;
  requirements?: string;
  categoryId?: string | null;
  salaryMinCents?: number | null;
  salaryMaxCents?: number | null;
  salaryPeriod?: string;
  employmentType?: string;
  workHours?: string;
  applyMethod?: string;
  applyUrl?: string;
  applyEmail?: string;
  city?: string;
  country?: string;
  addressLine?: string;
  latitude?: number | null;
  longitude?: number | null;
  media?: { type: "image" | "video"; url: string }[];
  groupId?: string | null;
  status?: "draft" | "active";
}) {
  await assertVerifiedSeller(input.employerId);
  if (!input.title.trim() || !input.company.trim()) throw new Error("INVALID_INPUT");

  const job = await db.job.create({
    data: {
      publicId: createJobPublicId(),
      employerId: input.employerId,
      categoryId: input.categoryId || null,
      title: input.title.trim(),
      company: input.company.trim(),
      description: input.description.trim(),
      requirements: input.requirements?.trim() || null,
      salaryMinCents: input.salaryMinCents ?? null,
      salaryMaxCents: input.salaryMaxCents ?? null,
      salaryPeriod: input.salaryPeriod ?? "monthly",
      employmentType: input.employmentType ?? "full_time",
      workHours: input.workHours || null,
      applyMethod: input.applyMethod ?? "message",
      applyUrl: input.applyUrl || null,
      applyEmail: input.applyEmail || null,
      city: input.city,
      country: input.country ?? "NL",
      addressLine: input.addressLine,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      groupId: input.groupId || null,
      status: input.status ?? "active",
      publishedAt: (input.status ?? "active") === "active" ? new Date() : null,
      media: input.media?.length
        ? {
            create: input.media.map((m, i) => ({
              type: m.type,
              url: m.url,
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: { media: true, category: true },
  });

  await writeAuditLog({
    actorUserId: input.employerId,
    action: "job.create",
    entityType: "Job",
    entityId: job.id,
  });

  return job;
}

export async function updateJobStatus(
  employerId: string,
  publicId: string,
  status: "active" | "paused" | "deleted" | "draft" | "filled",
) {
  const job = await db.job.findUnique({ where: { publicId } });
  if (!job || job.employerId !== employerId) throw new Error("FORBIDDEN");
  return db.job.update({
    where: { id: job.id },
    data: {
      status,
      publishedAt:
        status === "active" && !job.publishedAt ? new Date() : job.publishedAt,
    },
  });
}
