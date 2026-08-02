import "server-only";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export async function createReview(input: {
  authorId: string;
  orderPublicId: string;
  rating: number;
  content?: string;
  imagesJson?: string | null;
}) {
  if (input.rating < 1 || input.rating > 5) throw new Error("INVALID_RATING");

  const order = await db.marketOrder.findUnique({
    where: { publicId: input.orderPublicId },
    include: { review: true },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.buyerId !== input.authorId) throw new Error("FORBIDDEN");
  if (order.status !== "completed") throw new Error("ORDER_NOT_COMPLETED");
  if (order.review) throw new Error("ALREADY_REVIEWED");

  const review = await db.review.create({
    data: {
      orderId: order.id,
      authorId: input.authorId,
      subjectId: order.sellerId,
      productId: order.productId,
      serviceId: order.serviceId,
      rating: input.rating,
      content: input.content?.trim() || null,
      imagesJson: input.imagesJson ?? null,
    },
  });

  if (order.serviceId) {
    const stats = await db.review.aggregate({
      where: { serviceId: order.serviceId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await db.service.update({
      where: { id: order.serviceId },
      data: {
        ratingAvg: stats._avg.rating ?? input.rating,
        ratingCount: stats._count.rating,
      },
    });
  }

  await db.notification.create({
    data: {
      userId: order.sellerId,
      type: "review",
      title: "New review",
      body: `${input.rating}/5`,
      href: order.productId
        ? `/products/${(await db.product.findUnique({ where: { id: order.productId } }))?.publicId}`
        : order.serviceId
          ? `/services/${(await db.service.findUnique({ where: { id: order.serviceId } }))?.publicId}`
          : `/orders/${order.publicId}`,
    },
  });

  await writeAuditLog({
    actorUserId: input.authorId,
    action: "review.create",
    entityType: "Review",
    entityId: review.id,
  });

  return review;
}
