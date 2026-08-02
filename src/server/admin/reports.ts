import "server-only";
import { db } from "@/lib/db";
import { setUserAccountStatus } from "@/server/admin/users";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listReports(input: {
  status?: string;
  targetType?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;
  if (input.targetType) where.targetType = input.targetType;

  const [items, total] = await Promise.all([
    db.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        reporter: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } },
        post: { select: { id: true, content: true, authorId: true, hiddenAt: true } },
      },
    }),
    db.report.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getReportDetail(id: string) {
  return db.report.findUnique({
    where: { id },
    include: {
      reporter: { include: { profile: true } },
      post: {
        include: {
          author: { include: { profile: true } },
          media: true,
        },
      },
    },
  });
}

async function resolveTargetOwner(targetType: string, targetId: string) {
  if (targetType === "post") {
    const post = await db.post.findUnique({ where: { id: targetId } });
    return post?.authorId ?? null;
  }
  if (targetType === "comment") {
    const comment = await db.comment.findUnique({ where: { id: targetId } });
    return comment?.authorId ?? null;
  }
  if (targetType === "user") return targetId;
  if (targetType === "product") {
    const p = await db.product.findUnique({ where: { id: targetId } });
    return p?.sellerId ?? null;
  }
  if (targetType === "service") {
    const s = await db.service.findUnique({ where: { id: targetId } });
    return s?.providerId ?? null;
  }
  if (targetType === "group") {
    const g = await db.cityGroup.findUnique({ where: { id: targetId } });
    return g?.createdById ?? null;
  }
  return null;
}

export async function resolveReport(input: {
  adminId: string;
  reportId: string;
  action: "ignore" | "remove_content" | "warn" | "suspend_user" | "ban_user";
  note?: string;
}) {
  const report = await db.report.findUnique({ where: { id: input.reportId } });
  if (!report) throw new Error("REPORT_NOT_FOUND");

  const ownerId = await resolveTargetOwner(report.targetType, report.targetId);

  let status = "resolved";
  if (input.action === "ignore") status = "dismissed";

  if (input.action === "remove_content") {
    if (report.targetType === "post") {
      await db.post.update({ where: { id: report.targetId }, data: { hiddenAt: new Date(), deletedAt: new Date() } });
    } else if (report.targetType === "comment") {
      await db.comment.update({ where: { id: report.targetId }, data: { hiddenAt: new Date(), deletedAt: new Date() } });
    } else if (report.targetType === "product") {
      await db.product.update({ where: { id: report.targetId }, data: { hiddenAt: new Date(), status: "deleted" } });
    } else if (report.targetType === "service") {
      await db.service.update({ where: { id: report.targetId }, data: { hiddenAt: new Date(), status: "deleted" } });
    }
  }

  if (input.action === "warn" && ownerId) {
    await db.notification.create({
      data: {
        userId: ownerId,
        type: "moderation_warning",
        title: "Warning",
        body: input.note ?? "Your content was reported. Please follow our guidelines.",
        href: "/",
      },
    });
    await db.securityEvent.create({
      data: {
        publicId: `SE-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
        type: "spam",
        severity: "low",
        userId: ownerId,
        title: "User warned for reported content",
        description: input.note,
      },
    });
  }

  if ((input.action === "suspend_user" || input.action === "ban_user") && ownerId) {
    await setUserAccountStatus({
      adminId: input.adminId,
      userId: ownerId,
      action: input.action === "ban_user" ? "ban" : "suspend",
      reason: input.note ?? "Violation of platform guidelines",
    });
  }

  const updated = await db.report.update({
    where: { id: report.id },
    data: {
      status,
      actionTaken: input.action,
      resolvedById: input.adminId,
      resolvedAt: new Date(),
    },
  });

  await writeAdminAudit({
    adminId: input.adminId,
    action: `report.resolve.${input.action}`,
    entityType: "Report",
    entityId: report.id,
    newValue: { action: input.action, note: input.note },
    metadata: { targetType: report.targetType, targetId: report.targetId },
  });
  return updated;
}
