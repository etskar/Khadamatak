import "server-only";
import { db } from "@/lib/db";
import { createPaymentRequestPublicId } from "@/lib/ids";
import { writeAdminAudit } from "@/server/admin/guard";

export async function createSupportTicket(input: {
  userId?: string;
  category: string;
  subject: string;
  content: string;
  priority?: string;
}) {
  const ticket = await db.supportTicket.create({
    data: {
      publicId: createPaymentRequestPublicId().replace("KH-PR-", "KH-TK-"),
      userId: input.userId ?? null,
      category: input.category,
      subject: input.subject,
      priority: input.priority ?? "medium",
      messages: {
        create: {
          authorId: input.userId ?? null,
          authorType: input.userId ? "user" : "system",
          content: input.content,
        },
      },
    },
  });
  return ticket;
}

export async function listTickets(input: {
  status?: string;
  category?: string;
  priority?: string;
  assignedToId?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;
  if (input.category) where.category = input.category;
  if (input.priority) where.priority = input.priority;
  if (input.assignedToId) where.assignedToId = input.assignedToId;
  if (input.query) {
    where.OR = [{ subject: { contains: input.query } }, { publicId: { contains: input.query } }];
  }

  const [items, total] = await Promise.all([
    db.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
    }),
    db.supportTicket.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getTicket(publicId: string) {
  return db.supportTicket.findUnique({
    where: { publicId },
    include: {
      user: { include: { profile: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      closedBy: { select: { id: true, name: true } },
      mergedInto: { select: { publicId: true, subject: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { attachments: true },
      },
    },
  });
}

export async function replyToTicket(input: {
  adminId: string;
  ticketPublicId: string;
  content: string;
  attachmentUrls?: { url: string; name: string; mimeType?: string }[];
}) {
  const ticket = await db.supportTicket.findUnique({ where: { publicId: input.ticketPublicId } });
  if (!ticket) throw new Error("TICKET_NOT_FOUND");

  const message = await db.supportMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: input.adminId,
      authorType: "admin",
      content: input.content,
      ...(input.attachmentUrls?.length
        ? { attachments: { create: input.attachmentUrls.map((a) => ({ fileUrl: a.url, fileName: a.name, mimeType: a.mimeType })) } }
        : {}),
    },
  });

  await db.supportTicket.update({
    where: { id: ticket.id },
    data: { status: ticket.status === "closed" ? "in_progress" : ticket.status },
  });

  if (ticket.userId) {
    await db.notification.create({
      data: {
        userId: ticket.userId,
        type: "support_reply",
        title: "Support reply",
        body: input.content.slice(0, 140),
        href: `/settings/support/${ticket.publicId}`,
      },
    });
  }
  return message;
}

export async function assignTicket(input: {
  adminId: string;
  ticketPublicId: string;
  assigneeId?: string;
}) {
  const ticket = await db.supportTicket.findUnique({ where: { publicId: input.ticketPublicId } });
  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  const updated = await db.supportTicket.update({
    where: { id: ticket.id },
    data: {
      assignedToId: input.assigneeId ?? input.adminId,
      status: "assigned",
    },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "support.assign",
    entityType: "SupportTicket",
    entityId: ticket.id,
    newValue: { assigneeId: input.assigneeId ?? input.adminId },
  });
  return updated;
}

export async function escalateTicket(input: {
  adminId: string;
  ticketPublicId: string;
  note?: string;
}) {
  const ticket = await db.supportTicket.findUnique({ where: { publicId: input.ticketPublicId } });
  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  const updated = await db.supportTicket.update({
    where: { id: ticket.id },
    data: { escalated: true, priority: ticket.priority === "medium" ? "high" : ticket.priority, status: "in_progress" },
  });
  await db.supportMessage.create({
    data: { ticketId: ticket.id, authorId: input.adminId, authorType: "system", content: `Ticket escalated. ${input.note ?? ""}` },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "support.escalate",
    entityType: "SupportTicket",
    entityId: ticket.id,
    newValue: { note: input.note },
  });
  return updated;
}

export async function mergeTickets(input: {
  adminId: string;
  targetPublicId: string;
  intoPublicId: string;
}) {
  const target = await db.supportTicket.findUnique({ where: { publicId: input.targetPublicId } });
  const into = await db.supportTicket.findUnique({ where: { publicId: input.intoPublicId } });
  if (!target || !into) throw new Error("TICKET_NOT_FOUND");
  if (target.id === into.id) throw new Error("CANNOT_MERGE_SELF");

  await db.supportTicket.update({
    where: { id: target.id },
    data: { status: "merged", mergedIntoId: into.id },
  });
  await db.supportMessage.create({
    data: { ticketId: into.id, authorId: input.adminId, authorType: "system", content: `Merged ticket ${target.publicId}.` },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "support.merge",
    entityType: "SupportTicket",
    entityId: target.id,
    newValue: { mergedInto: into.id },
  });
  return { ok: true };
}

export async function setTicketStatus(input: {
  adminId: string;
  ticketPublicId: string;
  status: "open" | "in_progress" | "pending" | "closed";
}) {
  const ticket = await db.supportTicket.findUnique({ where: { publicId: input.ticketPublicId } });
  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  const updated = await db.supportTicket.update({
    where: { id: ticket.id },
    data: {
      status: input.status,
      closedAt: input.status === "closed" ? new Date() : null,
      closedById: input.status === "closed" ? input.adminId : null,
    },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: `support.${input.status === "closed" ? "close" : "status"}`,
    entityType: "SupportTicket",
    entityId: ticket.id,
    previousValue: ticket.status,
    newValue: input.status,
  });
  return updated;
}
