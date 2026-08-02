import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listMarketplaceItems(input: {
  kind: "product" | "service" | "request" | "deal";
  query?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));

  if (input.kind === "product") {
    const where: Record<string, unknown> = {};
    if (input.query) where.OR = [{ title: { contains: input.query } }, { description: { contains: input.query } }];
    if (input.status) where.status = input.status;
    const [items, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { seller: { include: { profile: { select: { displayName: true, username: true } } } }, media: true },
      }),
      db.product.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  if (input.kind === "service") {
    const where: Record<string, unknown> = {};
    if (input.query) where.OR = [{ title: { contains: input.query } }, { description: { contains: input.query } }];
    if (input.status) where.status = input.status;
    const [items, total] = await Promise.all([
      db.service.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { provider: { include: { profile: { select: { displayName: true, username: true } } } }, media: true },
      }),
      db.service.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  if (input.kind === "request") {
    const where: Record<string, unknown> = {};
    if (input.query) where.OR = [{ title: { contains: input.query } }, { description: { contains: input.query } }];
    if (input.status) where.status = input.status;
    const [items, total] = await Promise.all([
      db.marketRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { owner: { include: { profile: { select: { displayName: true, username: true } } } } },
      }),
      db.marketRequest.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  const where: Record<string, unknown> = {};
  if (input.query) where.OR = [{ terms: { contains: input.query } }];
  if (input.status) where.status = input.status;
  const [items, total] = await Promise.all([
    db.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        buyer: { include: { profile: { select: { displayName: true, username: true } } } },
        seller: { include: { profile: { select: { displayName: true, username: true } } } },
        product: { select: { title: true } },
        service: { select: { title: true } },
      },
    }),
    db.deal.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function setListingStatus(input: {
  adminId: string;
  kind: "product" | "service" | "request";
  publicId: string;
  action: "hide" | "restore" | "delete" | "approve";
}) {
  const modelMap = {
    product: db.product,
    service: db.service,
    request: db.marketRequest,
  } as const;

  const existing = await (
    modelMap[input.kind] as unknown as { findUnique: (args: { where: { publicId: string } }) => Promise<{ id: string; status: string } | null> }
  ).findUnique({
    where: { publicId: input.publicId },
  });
  if (!existing) throw new Error("NOT_FOUND");

  let data: Record<string, unknown> = {};
  if (input.action === "hide") data = { hiddenAt: new Date(), status: "paused" };
  if (input.action === "restore") data = { hiddenAt: null, status: "active" };
  if (input.action === "delete") data = { status: "deleted", hiddenAt: new Date() };
  if (input.action === "approve") data = { hiddenAt: null, status: "active" };

  await (
    modelMap[input.kind] as unknown as { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> }
  ).update({
    where: { id: existing.id },
    data,
  });

  await writeAdminAudit({
    adminId: input.adminId,
    action: `marketplace.${input.kind}.${input.action}`,
    entityType: input.kind === "request" ? "MarketRequest" : input.kind === "product" ? "Product" : "Service",
    entityId: existing.id,
    previousValue: existing.status,
    newValue: data,
  });
  return { ok: true };
}

export async function toggleListingFlag(input: {
  adminId: string;
  kind: "product" | "service";
  publicId: string;
  flag: "featured" | "pinned";
}) {
  const modelMap = {
    product: db.product,
    service: db.service,
  } as const;
  const existing = await (
    modelMap[input.kind] as unknown as { findUnique: (args: { where: { publicId: string } }) => Promise<{ id: string; [k: string]: unknown } | null> }
  ).findUnique({
    where: { publicId: input.publicId },
  });
  if (!existing) throw new Error("NOT_FOUND");
  const next = !Boolean(existing[input.flag]);
  await (
    modelMap[input.kind] as unknown as { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> }
  ).update({
    where: { id: existing.id as string },
    data: { [input.flag]: next },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: `marketplace.${input.kind}.${input.flag}`,
    entityType: input.kind === "product" ? "Product" : "Service",
    entityId: existing.id as string,
    newValue: { [input.flag]: next },
  });
  return { ok: true, value: next };
}
