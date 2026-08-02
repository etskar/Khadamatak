import "server-only";
import { db } from "@/lib/db";
import { createProductPublicId } from "@/lib/ids";
import { writeAuditLog } from "@/lib/audit";
import { assertVerifiedSeller } from "./guards";
import { boundingBox, haversineKm } from "./location";

export async function listProducts(input: {
  q?: string;
  categoryId?: string;
  city?: string;
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

  const items = await db.product.findMany({
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
        ? { seller: { verification: { status: "verified" } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      category: true,
      seller: {
        include: {
          profile: true,
          verification: true,
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const next = items.pop()!;
    nextCursor = next.id;
  }

  const withDistance =
    input.lat != null && input.lng != null
      ? items
          .map((p) => ({
            ...p,
            distanceKm:
              p.latitude != null && p.longitude != null
                ? haversineKm(input.lat!, input.lng!, p.latitude, p.longitude)
                : null,
          }))
          .filter(
            (p) =>
              input.radiusKm == null ||
              p.distanceKm == null ||
              p.distanceKm <= input.radiusKm,
          )
          .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
      : items.map((p) => ({ ...p, distanceKm: null as number | null }));

  return { items: withDistance, nextCursor };
}

export async function getProductByPublicId(publicId: string, viewerId?: string | null) {
  const product = await db.product.findUnique({
    where: { publicId },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      category: true,
      seller: {
        include: {
          profile: true,
          verification: true,
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          author: { include: { profile: true } },
        },
      },
    },
  });
  if (!product || product.status === "deleted") return null;

  await db.product.update({
    where: { id: product.id },
    data: { viewsCount: { increment: 1 } },
  });

  let favorited = false;
  if (viewerId) {
    const fav = await db.favorite.findUnique({
      where: {
        userId_targetType_targetId: {
          userId: viewerId,
          targetType: "product",
          targetId: product.id,
        },
      },
    });
    favorited = Boolean(fav);
  }

  return { ...product, viewsCount: product.viewsCount + 1, favorited };
}

export async function createProduct(input: {
  sellerId: string;
  title: string;
  description: string;
  categoryId?: string | null;
  priceCents: number;
  condition: string;
  city?: string;
  country?: string;
  addressLine?: string;
  latitude?: number | null;
  longitude?: number | null;
  media?: { type: "image" | "video"; url: string }[];
  groupId?: string | null;
  status?: "draft" | "active";
}) {
  await assertVerifiedSeller(input.sellerId);
  if (!input.title.trim() || input.priceCents < 1) throw new Error("INVALID_INPUT");

  const product = await db.product.create({
    data: {
      publicId: createProductPublicId(),
      sellerId: input.sellerId,
      categoryId: input.categoryId || null,
      title: input.title.trim(),
      description: input.description.trim(),
      priceCents: input.priceCents,
      condition: input.condition || "used",
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
    actorUserId: input.sellerId,
    action: "product.create",
    entityType: "Product",
    entityId: product.id,
  });

  return product;
}

export async function updateProductStatus(
  sellerId: string,
  publicId: string,
  status: "active" | "paused" | "deleted" | "draft",
) {
  const product = await db.product.findUnique({ where: { publicId } });
  if (!product || product.sellerId !== sellerId) throw new Error("FORBIDDEN");
  return db.product.update({
    where: { id: product.id },
    data: {
      status,
      publishedAt:
        status === "active" && !product.publishedAt ? new Date() : product.publishedAt,
    },
  });
}

export async function updateProduct(
  sellerId: string,
  publicId: string,
  data: Partial<{
    title: string;
    description: string;
    categoryId: string | null;
    priceCents: number;
    condition: string;
    city: string;
    country: string;
    addressLine: string;
    latitude: number | null;
    longitude: number | null;
  }>,
) {
  const product = await db.product.findUnique({ where: { publicId } });
  if (!product || product.sellerId !== sellerId) throw new Error("FORBIDDEN");
  return db.product.update({
    where: { id: product.id },
    data: {
      title: data.title?.trim(),
      description: data.description?.trim(),
      categoryId: data.categoryId,
      priceCents: data.priceCents,
      condition: data.condition,
      city: data.city,
      country: data.country,
      addressLine: data.addressLine,
      latitude: data.latitude,
      longitude: data.longitude,
    },
  });
}

export async function getSellerProducts(sellerId: string) {
  return db.product.findMany({
    where: { sellerId, status: { not: "deleted" } },
    orderBy: { createdAt: "desc" },
    include: { media: true, category: true, _count: { select: { orders: true } } },
  });
}
