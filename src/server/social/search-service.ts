import "server-only";
import { db } from "@/lib/db";

export async function searchAll(input: {
  query: string;
  userId?: string | null;
  limit?: number;
  filters?: {
    categoryId?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    verifiedOnly?: boolean;
  };
}) {
  const q = input.query.trim();
  if (!q) {
    return {
      users: [],
      posts: [],
      products: [],
      services: [],
      groups: [],
      requests: [],
    };
  }

  if (input.userId) {
    await db.searchHistory.create({
      data: { userId: input.userId, query: q },
    });
    const old = await db.searchHistory.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      skip: 20,
    });
    if (old.length) {
      await db.searchHistory.deleteMany({
        where: { id: { in: old.map((o) => o.id) } },
      });
    }
  }

  const limit = input.limit ?? 12;
  const f = input.filters ?? {};

  const [users, posts, products, services, groups, requests] = await Promise.all([
    db.profile.findMany({
      where: {
        OR: [
          { username: { contains: q } },
          { displayName: { contains: q } },
        ],
        ...(f.verifiedOnly
          ? { user: { verification: { status: "verified" } } }
          : {}),
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            verification: { select: { status: true } },
          },
        },
      },
    }),
    db.post.findMany({
      where: { deletedAt: null, content: { contains: q } },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: { include: { profile: true } },
        media: true,
      },
    }),
    db.product.findMany({
      where: {
        status: "active",
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { city: { contains: q } },
        ],
        ...(f.categoryId ? { categoryId: f.categoryId } : {}),
        ...(f.city ? { city: { contains: f.city } } : {}),
        ...(f.minPrice != null || f.maxPrice != null
          ? {
              priceCents: {
                ...(f.minPrice != null ? { gte: f.minPrice } : {}),
                ...(f.maxPrice != null ? { lte: f.maxPrice } : {}),
              },
            }
          : {}),
        ...(f.verifiedOnly
          ? { seller: { verification: { status: "verified" } } }
          : {}),
      },
      take: limit,
      include: {
        media: true,
        seller: { include: { profile: true, verification: true } },
        category: true,
      },
    }),
    db.service.findMany({
      where: {
        status: "active",
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { city: { contains: q } },
        ],
        ...(f.categoryId ? { categoryId: f.categoryId } : {}),
        ...(f.city ? { city: { contains: f.city } } : {}),
        ...(f.verifiedOnly
          ? { provider: { verification: { status: "verified" } } }
          : {}),
      },
      take: limit,
      include: {
        media: true,
        provider: { include: { profile: true, verification: true } },
        category: true,
      },
    }),
    db.cityGroup.findMany({
      where: {
        status: "active",
        OR: [
          { name: { contains: q } },
          { city: { contains: q } },
          { slug: { contains: q } },
        ],
      },
      take: limit,
    }),
    db.marketRequest.findMany({
      where: {
        status: "open",
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { startLocation: { contains: q } },
          { destination: { contains: q } },
        ],
      },
      take: limit,
      include: {
        owner: { include: { profile: true } },
        category: true,
      },
    }),
  ]);

  return { users, posts, products, services, groups, requests };
}

export async function getRecentSearches(userId: string) {
  return db.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

export async function clearSearchHistory(userId: string) {
  await db.searchHistory.deleteMany({ where: { userId } });
}
