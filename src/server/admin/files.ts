import "server-only";
import { db } from "@/lib/db";

/** Aggregated overview of uploaded media across the platform (no File table exists). */
export async function getFilesOverview() {
  const [
    listingMediaCount,
    productMediaCount,
    serviceMediaCount,
    postMediaCount,
    reviewsWithImages,
    verificationDocs,
    attachmentCount,
  ] = await Promise.all([
    db.listingMedia.count(),
    db.listingMedia.count({ where: { productId: { not: null } } }),
    db.listingMedia.count({ where: { serviceId: { not: null } } }),
    db.postMedia.count(),
    db.review.count({ where: { imagesJson: { not: null } } }),
    db.identityVerification.count({ where: { governmentIdUrl: { not: null } } }),
    db.supportAttachment.count(),
  ]);

  return {
    counts: {
      listingMedia: listingMediaCount,
      productImages: productMediaCount,
      serviceImages: serviceMediaCount,
      postImages: postMediaCount,
      reviewsWithImages: reviewsWithImages,
      verificationDocuments: verificationDocs,
      supportAttachments: attachmentCount,
    },
    note: "Storage quotas and object-storage integration are handled by the storage provider layer.",
  };
}

export async function listRecentUploads(input: { page?: number; pageSize?: number }) {
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));

  const [products, services, posts] = await Promise.all([
    db.product.findMany({
      where: { media: { some: {} } },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      include: {
        media: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.service.findMany({
      where: { media: { some: {} } },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      include: {
        media: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.post.findMany({
      where: { media: { some: {} } },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      include: { media: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  const items = [
    ...products.flatMap((p) =>
      p.media.map((m) => ({ kind: "product", url: m.url, ref: p.publicId, refTitle: p.title, createdAt: p.createdAt })),
    ),
    ...services.flatMap((s) =>
      s.media.map((m) => ({ kind: "service", url: m.url, ref: s.publicId, refTitle: s.title, createdAt: s.createdAt })),
    ),
    ...posts.flatMap((p) =>
      p.media.map((m) => ({ kind: "post", url: m.url, ref: p.id, refTitle: p.content ?? null, createdAt: p.createdAt })),
    ),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { items: items.slice(0, pageSize), page: 1, pageSize };
}
