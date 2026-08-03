import "server-only";
import { db } from "@/lib/db";
import { createServicePublicId } from "@/lib/ids";
import { writeAuditLog } from "@/lib/audit";
import { assertVerifiedSeller } from "./guards";
import { boundingBox, haversineKm } from "./location";

export async function listServices(input: {
  q?: string;
  categoryId?: string;
  city?: string;
  pricingType?: string;
  minPrice?: number;
  maxPrice?: number;
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

  if (input.lat != null && input.lng != null && input.radiusKm) {
    const box = boundingBox(input.lat, input.lng, input.radiusKm);
    geoFilter = {
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
    };
  }

  const items = await db.service.findMany({
    where: {
      status: "active",
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q } },
              { description: { contains: input.q } },
              { city: { contains: input.q } },
            ],
          }
        : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.city ? { city: { contains: input.city } } : {}),
      ...(input.pricingType ? { pricingType: input.pricingType } : {}),
      ...(input.minPrice != null || input.maxPrice != null
        ? {
            priceCents: {
              ...(input.minPrice != null ? { gte: input.minPrice } : {}),
              ...(input.maxPrice != null ? { lte: input.maxPrice } : {}),
            },
          }
        : {}),
      ...(geoFilter ?? {}),
      ...(input.verifiedOnly
        ? { provider: { verification: { status: "verified" } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      category: true,
      provider: { include: { profile: true, verification: true } },
    },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    nextCursor = items.pop()!.id;
  }

  const withDistance =
    input.lat != null && input.lng != null
      ? items.map((s) => ({
          ...s,
          distanceKm:
            s.latitude != null && s.longitude != null
              ? haversineKm(input.lat!, input.lng!, s.latitude, s.longitude)
              : null,
        }))
      : items.map((s) => ({ ...s, distanceKm: null as number | null }));

  return { items: withDistance, nextCursor };
}

export async function getServiceByPublicId(publicId: string, viewerId?: string | null) {
  const service = await db.service.findUnique({
    where: { publicId },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      category: true,
      provider: { include: { profile: true, verification: true } },
    },
  });
  if (!service || service.status === "deleted") return null;

  await db.service.update({
    where: { id: service.id },
    data: { viewsCount: { increment: 1 } },
  });

  let favorited = false;
  if (viewerId) {
    favorited = Boolean(
      await db.favorite.findUnique({
        where: {
          userId_targetType_targetId: {
            userId: viewerId,
            targetType: "service",
            targetId: service.id,
          },
        },
      }),
    );
  }

  return { ...service, viewsCount: service.viewsCount + 1, favorited };
}

export async function createService(input: {
  providerId: string;
  title: string;
  description: string;
  categoryId?: string | null;
  priceCents?: number | null;
  pricingType: string;
  availability?: string;
  workingHours?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  media?: { type: "image" | "video"; url: string }[];
  groupId?: string | null;
  status?: "draft" | "active";
}) {
  await assertVerifiedSeller(input.providerId);
  if (!input.title.trim()) throw new Error("INVALID_INPUT");

  const service = await db.service.create({
    data: {
      publicId: createServicePublicId(),
      providerId: input.providerId,
      categoryId: input.categoryId || null,
      title: input.title.trim(),
      description: input.description.trim(),
      priceCents: input.priceCents ?? null,
      pricingType: input.pricingType || "fixed",
      availability: input.availability,
      workingHours: input.workingHours,
      city: input.city,
      country: input.country ?? "NL",
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
    actorUserId: input.providerId,
    action: "service.create",
    entityType: "Service",
    entityId: service.id,
  });

  return service;
}

export async function updateServiceStatus(
  providerId: string,
  publicId: string,
  status: "active" | "paused" | "deleted" | "draft",
) {
  const service = await db.service.findUnique({ where: { publicId } });
  if (!service || service.providerId !== providerId) throw new Error("FORBIDDEN");
  return db.service.update({
    where: { id: service.id },
    data: {
      status,
      publishedAt:
        status === "active" && !service.publishedAt
          ? new Date()
          : service.publishedAt,
    },
  });
}

export async function getProviderServices(providerId: string) {
  return db.service.findMany({
    where: { providerId, status: { not: "deleted" } },
    orderBy: { createdAt: "desc" },
    include: { media: true, category: true, _count: { select: { favorites: true } } },
  });
}
