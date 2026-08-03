import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listMarketplaceItems(input: {
  kind: "product" | "service" | "job";
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

  const where: Record<string, unknown> = {};
  if (input.query) where.OR = [{ title: { contains: input.query } }, { company: { contains: input.query } }, { description: { contains: input.query } }];
  if (input.status) where.status = input.status;
  const [items, total] = await Promise.all([
    db.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { employer: { include: { profile: { select: { displayName: true, username: true } } } }, media: true },
    }),
    db.job.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function setListingStatus(input: {
  adminId: string;
  kind: "product" | "service" | "job";
  publicId: string;
  action: "hide" | "restore" | "delete" | "approve";
}) {
  const modelMap = {
    product: db.product,
    service: db.service,
    job: db.job,
  } as const;

  const model = modelMap[input.kind] as unknown as {
    findUnique: (args: {
      where: { publicId: string };
      select?: Record<string, boolean>;
    }) => Promise<Record<string, unknown> | null>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };

  const existing = await model.findUnique({
    where: { publicId: input.publicId },
    select: { id: true, status: true, featured: true, pinned: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  let data: Record<string, unknown> = {};
  if (input.action === "hide") data = { hiddenAt: new Date(), status: "paused" };
  if (input.action === "restore") data = { hiddenAt: null, status: "active" };
  if (input.action === "delete") data = { status: "deleted", hiddenAt: new Date() };
  if (input.action === "approve") data = { hiddenAt: null, status: "active" };

  await model.update({ where: { id: existing.id as string }, data });

  const entityType =
    input.kind === "product"
      ? "Product"
      : input.kind === "service"
        ? "Service"
        : "Job";

  await writeAdminAudit({
    adminId: input.adminId,
    action: `marketplace.${input.kind}.${input.action}`,
    entityType,
    entityId: existing.id as string,
    previousValue: existing.status,
    newValue: data,
  });
  return { ok: true };
}

export async function toggleListingFlag(input: {
  adminId: string;
  kind: "product" | "service" | "job";
  publicId: string;
  flag: "featured" | "pinned";
}) {
  const modelMap = {
    product: db.product,
    service: db.service,
    job: db.job,
  } as const;

  const model = modelMap[input.kind] as unknown as {
    findUnique: (args: {
      where: { publicId: string };
      select?: Record<string, boolean>;
    }) => Promise<Record<string, unknown> | null>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };

  const existing = await model.findUnique({
    where: { publicId: input.publicId },
    select: { id: true, featured: true, pinned: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  const value = !(existing[input.flag] as boolean);
  await model.update({
    where: { id: existing.id as string },
    data: { [input.flag]: value },
  });

  const entityType =
    input.kind === "product"
      ? "Product"
      : input.kind === "service"
        ? "Service"
        : "Job";

  await writeAdminAudit({
    adminId: input.adminId,
    action: `marketplace.${input.kind}.${input.flag}`,
    entityType,
    entityId: existing.id as string,
    previousValue: existing[input.flag] as boolean,
    newValue: value,
  });
  return { ok: true };
}
