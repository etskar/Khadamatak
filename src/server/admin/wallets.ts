import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listWallets(input: {
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
    where.OR = [
      { walletId: { contains: input.query } },
      { walletUsername: { contains: input.query } },
      { user: { is: { profile: { is: { username: { contains: input.query } } } } } },
      { user: { is: { email: { contains: input.query } } } },
    ];
  }

  const [items, total] = await Promise.all([
    db.wallet.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { include: { profile: { select: { displayName: true, username: true, avatarUrl: true } } } } },
    }),
    db.wallet.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getWalletDetail(userId: string) {
  const wallet = await db.wallet.findUnique({
    where: { userId },
    include: { user: { include: { profile: true } } },
  });
  if (!wallet) return null;

  const [transactions, ledger] = await Promise.all([
    db.financialTransaction.findMany({
      where: { OR: [{ fromWalletId: wallet.id }, { toWalletId: wallet.id }, { actorUserId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.ledgerEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return { wallet, transactions, ledger };
}

export async function setWalletStatus(input: {
  adminId: string;
  userId: string;
  action: "freeze" | "unfreeze";
  reason?: string;
}) {
  const wallet = await db.wallet.findUnique({ where: { userId: input.userId } });
  if (!wallet) throw new Error("WALLET_NOT_FOUND");

  const next = input.action === "freeze" ? "locked" : "active";
  await db.wallet.update({ where: { id: wallet.id }, data: { status: next } });

  await db.notification.create({
    data: {
      userId: input.userId,
      type: "wallet_status",
      title: input.action === "freeze" ? "Wallet frozen" : "Wallet unfrozen",
      body: input.reason ?? (input.action === "freeze" ? "Your wallet has been frozen." : "Your wallet has been unfrozen."),
      href: "/wallet",
    },
  });

  await writeAdminAudit({
    adminId: input.adminId,
    action: `wallet.${input.action}`,
    entityType: "Wallet",
    entityId: wallet.id,
    previousValue: wallet.status,
    newValue: next,
    metadata: { reason: input.reason },
  });
  return { ok: true, status: next };
}

export async function exportWalletHistory(userId: string) {
  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) return [];
  return db.financialTransaction.findMany({
    where: { OR: [{ fromWalletId: wallet.id }, { toWalletId: wallet.id }, { actorUserId: userId }] },
    orderBy: { createdAt: "desc" },
  });
}
