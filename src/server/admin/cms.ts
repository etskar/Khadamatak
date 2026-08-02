import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listCmsPages(input: {
  status?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;
  if (input.query) {
    where.OR = [{ slug: { contains: input.query } }, { titleJson: { contains: input.query } }];
  }

  const [items, total] = await Promise.all([
    db.cmsPage.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.cmsPage.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getCmsPage(id: string) {
  const page = await db.cmsPage.findUnique({ where: { id } });
  if (!page) return null;
  return { ...page, title: safeJson(page.titleJson), content: safeJson(page.contentJson) };
}

export async function upsertCmsPage(input: {
  adminId: string;
  id?: string;
  slug: string;
  title: { ar: string; nl: string };
  content?: unknown;
  status?: string;
  authorId?: string;
}) {
  const data = {
    slug: input.slug,
    titleJson: JSON.stringify(input.title),
    contentJson: input.content ? JSON.stringify(input.content) : "{}",
    status: input.status ?? "draft",
    ...(input.status === "published"
      ? { publishedAt: new Date() }
      : {}),
    ...(input.authorId ? { authorId: input.authorId } : {}),
  };

  if (input.id) {
    const existing = await db.cmsPage.findUnique({ where: { id: input.id } });
    if (!existing) throw new Error("PAGE_NOT_FOUND");
    const updated = await db.cmsPage.update({ where: { id: input.id }, data });
    await writeAdminAudit({
      adminId: input.adminId,
      action: "cms.page.update",
      entityType: "CmsPage",
      entityId: input.id,
      previousValue: { slug: existing.slug, status: existing.status },
      newValue: { slug: input.slug, status: data.status },
    });
    return updated;
  }

  const slugExists = await db.cmsPage.findUnique({ where: { slug: input.slug } });
  if (slugExists) throw new Error("SLUG_EXISTS");
  const created = await db.cmsPage.create({ data });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "cms.page.create",
    entityType: "CmsPage",
    entityId: created.id,
  });
  return created;
}

export async function setCmsPageStatus(adminId: string, id: string, status: string) {
  const existing = await db.cmsPage.findUnique({ where: { id } });
  if (!existing) throw new Error("PAGE_NOT_FOUND");
  const updated = await db.cmsPage.update({
    where: { id },
    data: { status, ...(status === "published" ? { publishedAt: new Date() } : {}) },
  });
  await writeAdminAudit({
    adminId,
    action: `cms.page.${status}`,
    entityType: "CmsPage",
    entityId: id,
    previousValue: existing.status,
    newValue: status,
  });
  return updated;
}

export async function deleteCmsPage(adminId: string, id: string) {
  await db.cmsPage.delete({ where: { id } });
  await writeAdminAudit({
    adminId,
    action: "cms.page.delete",
    entityType: "CmsPage",
    entityId: id,
  });
  return { ok: true };
}

// ─── CMS Sections (keyed content blocks: hero | features | how_it_works | app_download) ───

export async function listCmsSections() {
  return db.cmsSection.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function upsertCmsSection(input: {
  adminId: string;
  key: string;
  heading?: { ar: string; nl: string };
  subheading?: { ar: string; nl: string };
  ctaLabel?: { ar: string; nl: string };
  ctaHref?: string;
  imageUrl?: string;
  enabled?: boolean;
  sortOrder?: number;
}) {
  const existing = await db.cmsSection.findUnique({ where: { key: input.key } });
  const updated = await db.cmsSection.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      headingJson: input.heading ? JSON.stringify(input.heading) : null,
      subheadingJson: input.subheading ? JSON.stringify(input.subheading) : null,
      ctaLabelJson: input.ctaLabel ? JSON.stringify(input.ctaLabel) : null,
      ctaHref: input.ctaHref,
      imageUrl: input.imageUrl,
      enabled: input.enabled ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
    update: {
      ...(input.heading ? { headingJson: JSON.stringify(input.heading) } : {}),
      ...(input.subheading ? { subheadingJson: JSON.stringify(input.subheading) } : {}),
      ...(input.ctaLabel ? { ctaLabelJson: JSON.stringify(input.ctaLabel) } : {}),
      ...(input.ctaHref !== undefined ? { ctaHref: input.ctaHref } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: `cms.section.${existing ? "update" : "create"}`,
    entityType: "CmsSection",
    entityId: updated.id,
    newValue: { key: input.key },
  });
  return updated;
}

export async function deleteCmsSection(adminId: string, key: string) {
  const existing = await db.cmsSection.findUnique({ where: { key } });
  if (!existing) throw new Error("SECTION_NOT_FOUND");
  await db.cmsSection.delete({ where: { key } });
  await writeAdminAudit({
    adminId,
    action: "cms.section.delete",
    entityType: "CmsSection",
    entityId: existing.id,
  });
  return { ok: true };
}

// ─── CMS Banners ───

export async function listCmsBanners(input: { placement?: string; active?: boolean }) {
  const where: Record<string, unknown> = {};
  if (input.placement) where.placement = input.placement;
  if (input.active !== undefined) where.active = input.active;
  return db.cmsBanner.findMany({
    where,
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }],
  });
}

export async function upsertCmsBanner(input: {
  adminId: string;
  id?: string;
  placement: string;
  title: { ar: string; nl: string };
  subtitle?: { ar: string; nl: string };
  imageUrl?: string;
  linkUrl?: string;
  audience?: string;
  active?: boolean;
  sortOrder?: number;
  startsAt?: string;
  endsAt?: string;
}) {
  const data = {
    placement: input.placement,
    titleJson: JSON.stringify(input.title),
    subtitleJson: input.subtitle ? JSON.stringify(input.subtitle) : null,
    imageUrl: input.imageUrl,
    linkUrl: input.linkUrl,
    audience: input.audience ?? "all",
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 0,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  };
  if (input.id) {
    const updated = await db.cmsBanner.update({ where: { id: input.id }, data });
    await writeAdminAudit({
      adminId: input.adminId,
      action: "cms.banner.update",
      entityType: "CmsBanner",
      entityId: input.id,
    });
    return updated;
  }
  const created = await db.cmsBanner.create({ data });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "cms.banner.create",
    entityType: "CmsBanner",
    entityId: created.id,
  });
  return created;
}

export async function deleteCmsBanner(adminId: string, id: string) {
  await db.cmsBanner.delete({ where: { id } });
  await writeAdminAudit({
    adminId,
    action: "cms.banner.delete",
    entityType: "CmsBanner",
    entityId: id,
  });
  return { ok: true };
}

// ─── CMS Menu ───

export async function listCmsMenu(input: { placement?: string }) {
  const where: Record<string, unknown> = input.placement ? { placement: input.placement } : {};
  return db.cmsMenuItem.findMany({
    where,
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }],
    include: { children: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function upsertCmsMenuItem(input: {
  adminId: string;
  id?: string;
  placement: string;
  label: { ar: string; nl: string };
  href: string;
  sortOrder?: number;
  parentId?: string;
}) {
  const data = {
    placement: input.placement,
    labelJson: JSON.stringify(input.label),
    href: input.href,
    sortOrder: input.sortOrder ?? 0,
    parentId: input.parentId ?? null,
  };
  if (input.id) {
    const updated = await db.cmsMenuItem.update({ where: { id: input.id }, data });
    await writeAdminAudit({
      adminId: input.adminId,
      action: "cms.menu.update",
      entityType: "CmsMenuItem",
      entityId: input.id,
    });
    return updated;
  }
  const created = await db.cmsMenuItem.create({ data });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "cms.menu.create",
    entityType: "CmsMenuItem",
    entityId: created.id,
  });
  return created;
}

export async function deleteCmsMenuItem(adminId: string, id: string) {
  await db.cmsMenuItem.delete({ where: { id } });
  await writeAdminAudit({
    adminId,
    action: "cms.menu.delete",
    entityType: "CmsMenuItem",
    entityId: id,
  });
  return { ok: true };
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
