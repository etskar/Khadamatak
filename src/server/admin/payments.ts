import "server-only";
import { db } from "@/lib/db";

export async function listPayments(input: {
  type?: string;
  status?: string;
  paymentMethod?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (input.type) where.type = input.type;
  if (input.status) where.status = input.status;
  if (input.paymentMethod) where.paymentMethod = input.paymentMethod;
  if (input.query) {
    where.OR = [
      { reference: { contains: input.query } },
      { providerRef: { contains: input.query } },
      { actorUserId: { contains: input.query } },
    ];
  }

  const [items, total] = await Promise.all([
    db.financialTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        fromWallet: { include: { user: { select: { profile: { select: { displayName: true, username: true } } } } } },
        toWallet: { include: { user: { select: { profile: { select: { displayName: true, username: true } } } } } },
        escrow: { select: { publicId: true, status: true } },
        paymentRequest: { select: { publicId: true, description: true } },
      },
    }),
    db.financialTransaction.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getPaymentDetail(id: string) {
  return db.financialTransaction.findUnique({
    where: { id },
    include: {
      fromWallet: { include: { user: { include: { profile: true } } } },
      toWallet: { include: { user: { include: { profile: true } } } },
      escrow: { include: { events: true } },
      paymentRequest: true,
      ledgerEntries: true,
      auditLogs: true,
    },
  });
}

export async function listPaymentRequests(input: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;

  const [items, total] = await Promise.all([
    db.paymentRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        fromUser: { include: { profile: { select: { displayName: true, username: true } } } },
        toUser: { include: { profile: { select: { displayName: true, username: true } } } },
      },
    }),
    db.paymentRequest.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
