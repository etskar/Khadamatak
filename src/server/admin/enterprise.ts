import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listBusinessAccounts(input: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = input.status ? { status: input.status } : {};
  const [items, total] = await Promise.all([
    db.businessAccount.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } },
      },
    }),
    db.businessAccount.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function verifyBusinessAccount(adminId: string, id: string) {
  const existing = await db.businessAccount.findUnique({ where: { id } });
  if (!existing) throw new Error("BUSINESS_ACCOUNT_NOT_FOUND");
  const updated = await db.businessAccount.update({
    where: { id },
    data: { status: "verified", verifiedAt: new Date() },
  });
  await writeAdminAudit({
    adminId,
    action: "business.verify",
    entityType: "BusinessAccount",
    entityId: id,
    previousValue: existing.status,
    newValue: "verified",
  });
  return updated;
}

export async function rejectBusinessAccount(adminId: string, id: string) {
  const existing = await db.businessAccount.findUnique({ where: { id } });
  if (!existing) throw new Error("BUSINESS_ACCOUNT_NOT_FOUND");
  const updated = await db.businessAccount.update({
    where: { id },
    data: { status: "rejected" },
  });
  await writeAdminAudit({
    adminId,
    action: "business.reject",
    entityType: "BusinessAccount",
    entityId: id,
    previousValue: existing.status,
    newValue: "rejected",
  });
  return updated;
}

export async function listSubscriptions(input: { status?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = input.status ? { status: input.status } : {};
  const [items, total] = await Promise.all([
    db.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } },
        plan: { select: { key: true, name: true, priceCents: true, billingPeriod: true } },
      },
    }),
    db.subscription.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function listCoupons() {
  return db.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listGiftCards(input: { status?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = input.status ? { status: input.status } : {};
  const [items, total] = await Promise.all([
    db.giftCard.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.giftCard.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function listAdCampaigns(input: { status?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = input.status ? { status: input.status } : {};
  const [items, total] = await Promise.all([
    db.adCampaign.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } },
      },
    }),
    db.adCampaign.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
