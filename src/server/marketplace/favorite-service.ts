import "server-only";
import { db } from "@/lib/db";

export async function toggleFavorite(input: {
  userId: string;
  targetType: "product" | "service" | "post" | "group" | "seller";
  targetId: string;
}) {
  const existing = await db.favorite.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: input.userId,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    if (input.targetType === "product") {
      await db.product.update({
        where: { id: input.targetId },
        data: { favoritesCount: { decrement: 1 } },
      });
    }
    if (input.targetType === "service") {
      await db.service.update({
        where: { id: input.targetId },
        data: { favoritesCount: { decrement: 1 } },
      });
    }
    return { favorited: false };
  }

  await db.favorite.create({
    data: {
      userId: input.userId,
      targetType: input.targetType,
      targetId: input.targetId,
      productId: input.targetType === "product" ? input.targetId : null,
      serviceId: input.targetType === "service" ? input.targetId : null,
      groupId: input.targetType === "group" ? input.targetId : null,
    },
  });

  if (input.targetType === "product") {
    await db.product.update({
      where: { id: input.targetId },
      data: { favoritesCount: { increment: 1 } },
    });
  }
  if (input.targetType === "service") {
    await db.service.update({
      where: { id: input.targetId },
      data: { favoritesCount: { increment: 1 } },
    });
  }

  return { favorited: true };
}

export async function listFavorites(userId: string) {
  const items = await db.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          media: true,
          seller: { include: { profile: true, verification: true } },
        },
      },
      service: {
        include: {
          media: true,
          provider: { include: { profile: true, verification: true } },
        },
      },
      group: true,
    },
  });
  return items;
}
