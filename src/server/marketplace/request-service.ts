import "server-only";
import { db } from "@/lib/db";
import { createRequestPublicId } from "@/lib/ids";
import { writeAuditLog } from "@/lib/audit";

export async function listRequests(input: {
  q?: string;
  categoryId?: string;
  city?: string;
  cursor?: string | null;
  limit?: number;
}) {
  const limit = Math.min(input.limit ?? 20, 50);
  const items = await db.marketRequest.findMany({
    where: {
      status: "open",
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q } },
              { description: { contains: input.q } },
              { startLocation: { contains: input.q } },
              { destination: { contains: input.q } },
            ],
          }
        : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.city
        ? {
            OR: [
              { startLocation: { contains: input.city } },
              { destination: { contains: input.city } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    include: {
      category: true,
      owner: { include: { profile: true, verification: true } },
    },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) nextCursor = items.pop()!.id;
  return { items, nextCursor };
}

export async function getRequestByPublicId(publicId: string) {
  const req = await db.marketRequest.findUnique({
    where: { publicId },
    include: {
      category: true,
      owner: { include: { profile: true, verification: true } },
    },
  });
  if (!req) return null;
  await db.marketRequest.update({
    where: { id: req.id },
    data: { viewsCount: { increment: 1 } },
  });
  return { ...req, viewsCount: req.viewsCount + 1 };
}

export async function createRequest(input: {
  ownerId: string;
  title: string;
  description: string;
  categoryId?: string | null;
  budgetCents?: number | null;
  startLocation?: string;
  destination?: string;
  neededAt?: Date | null;
  attachmentsJson?: string | null;
  groupId?: string | null;
}) {
  if (!input.title.trim()) throw new Error("INVALID_INPUT");

  const request = await db.marketRequest.create({
    data: {
      publicId: createRequestPublicId(),
      ownerId: input.ownerId,
      title: input.title.trim(),
      description: input.description.trim(),
      categoryId: input.categoryId || null,
      budgetCents: input.budgetCents ?? null,
      startLocation: input.startLocation,
      destination: input.destination,
      neededAt: input.neededAt ?? null,
      attachmentsJson: input.attachmentsJson ?? null,
      groupId: input.groupId || null,
      status: "open",
    },
  });

  await writeAuditLog({
    actorUserId: input.ownerId,
    action: "request.create",
    entityType: "MarketRequest",
    entityId: request.id,
  });

  await db.notification.create({
    data: {
      userId: input.ownerId,
      type: "request",
      title: "Request published",
      body: request.title,
      href: `/requests/${request.publicId}`,
    },
  });

  return request;
}
