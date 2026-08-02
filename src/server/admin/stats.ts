import "server-only";
import { db } from "@/lib/db";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export async function getDashboardStats() {
  const now = new Date();
  const onlineSince = new Date(now.getTime() - 15 * 60 * 1000);

  const [
    totalUsers,
    onlineUsers,
    verifiedUsers,
    pendingVerifications,
    activeProducts,
    activeServices,
    activeRequests,
    activeDeals,
    activeOrders,
    escrowBalance,
    walletBalance,
    revenueToday,
    revenueMonth,
    commissionTotal,
    openDisputes,
    supportTickets,
    reportsWaiting,
    totalListings,
    activeEscrows,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { lastActiveAt: { gt: onlineSince }, accountStatus: "active" } }),
    db.identityVerification.count({ where: { status: "verified" } }),
    db.identityVerification.count({ where: { status: "pending" } }),
    db.product.count({ where: { status: "active", hiddenAt: null } }),
    db.service.count({ where: { status: "active", hiddenAt: null } }),
    db.marketRequest.count({ where: { status: { in: ["open", "in_progress"] }, hiddenAt: null } }),
    db.deal.count({ where: { status: { in: ["accepted", "payment_pending", "in_escrow"] } } }),
    db.marketOrder.count({ where: { status: { in: ["payment_secured", "processing", "delivered", "disputed"] } } }),
    db.escrow.aggregate({ _sum: { amountCents: true }, where: { status: { in: ["funded", "delivered", "disputed"] } } }),
    db.wallet.aggregate({ _sum: { availableCents: true }, where: { status: "active" } }),
    db.marketOrder.aggregate({ _sum: { platformFeeCents: true }, where: { status: { in: ["completed", "refunded"] }, createdAt: { gte: startOfDay(now) } } }),
    db.marketOrder.aggregate({ _sum: { platformFeeCents: true }, where: { status: { in: ["completed", "refunded"] }, createdAt: { gte: daysAgo(30) } } }),
    db.marketOrder.aggregate({ _sum: { platformFeeCents: true }, where: { status: { in: ["completed", "refunded"] } } }),
    db.dispute.count({ where: { status: { in: ["open", "under_review"] } } }),
    db.supportTicket.count({ where: { status: { in: ["open", "assigned", "in_progress", "pending"] } } }),
    db.report.count({ where: { status: { in: ["open", "reviewing"] } } }),
    Promise.all([
      db.product.count({ where: { hiddenAt: null } }),
      db.service.count({ where: { hiddenAt: null } }),
    ]).then(([a, b]) => a + b),
    db.escrow.count({ where: { status: { in: ["funded", "delivered", "disputed"] } } }),
  ]);

  return {
    totalUsers,
    onlineUsers,
    verifiedUsers,
    pendingVerifications,
    activeProducts,
    activeServices,
    activeRequests,
    activeDeals,
    activeOrders,
    escrowBalanceCents: escrowBalance._sum.amountCents ?? 0,
    walletBalanceCents: walletBalance._sum.availableCents ?? 0,
    revenueTodayCents: revenueToday._sum.platformFeeCents ?? 0,
    revenueMonthCents: revenueMonth._sum.platformFeeCents ?? 0,
    commissionCents: commissionTotal._sum.platformFeeCents ?? 0,
    openDisputes,
    supportTickets,
    reportsWaiting,
    totalListings,
    activeEscrows,
  };
}

export async function getAnalyticsStats() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = daysAgo(7);
  const monthStart = daysAgo(30);
  const onlineSince = new Date(now.getTime() - 15 * 60 * 1000);

  const [users, marketplace, orders, deals, finance, communities, topSellers, topGroups, mostViewed, mostSold, topRated] =
    await Promise.all([
      // Users
      Promise.all([
        db.user.count(),
        db.user.count({ where: { createdAt: { gte: dayStart } } }),
        db.user.count({ where: { lastActiveAt: { gt: daysAgo(30) } } }),
        db.user.count({ where: { lastActiveAt: { gt: onlineSince }, accountStatus: "active" } }),
        db.identityVerification.count({ where: { status: "verified" } }),
        db.identityVerification.count({ where: { status: "pending" } }),
        db.user.count({ where: { accountStatus: "suspended" } }),
        db.user.count({ where: { accountStatus: "banned" } }),
      ]),
      // Marketplace
      Promise.all([
        db.product.count({ where: { hiddenAt: null } }),
        db.service.count({ where: { hiddenAt: null } }),
        db.marketRequest.count({ where: { hiddenAt: null } }),
        Promise.all([
          db.product.count({ where: { status: "active", hiddenAt: null } }),
          db.service.count({ where: { status: "active", hiddenAt: null } }),
        ]).then(([a, b]) => a + b),
        db.marketOrder.count({ where: { createdAt: { gte: monthStart } } }),
        db.review.count({ where: { createdAt: { gte: monthStart } } }),
      ]),
      // Orders
      Promise.all([
        db.marketOrder.count({ where: { createdAt: { gte: dayStart } } }),
        db.marketOrder.count({ where: { createdAt: { gte: weekStart } } }),
        db.marketOrder.count({ where: { createdAt: { gte: monthStart } } }),
        db.marketOrder.count({ where: { status: "completed" } }),
        db.marketOrder.count({ where: { status: "cancelled" } }),
        db.marketOrder.count({ where: { status: "refunded" } }),
        db.marketOrder.count({ where: { status: "disputed" } }),
      ]),
      // Deals
      Promise.all([
        db.deal.count({ where: { status: { in: ["accepted", "payment_pending", "in_escrow"] } } }),
        db.deal.count({ where: { status: "completed" } }),
        db.deal.count({ where: { status: "cancelled" } }),
      ]),
      // Finance
      Promise.all([
        db.marketOrder.aggregate({ _sum: { platformFeeCents: true }, where: { status: { in: ["completed", "refunded"] }, createdAt: { gte: dayStart } } }),
        db.marketOrder.aggregate({ _sum: { platformFeeCents: true }, where: { status: { in: ["completed", "refunded"] }, createdAt: { gte: weekStart } } }),
        db.marketOrder.aggregate({ _sum: { platformFeeCents: true }, where: { status: { in: ["completed", "refunded"] }, createdAt: { gte: monthStart } } }),
        db.marketOrder.aggregate({ _sum: { platformFeeCents: true }, where: { status: { in: ["completed", "refunded"] } } }),
        db.escrow.aggregate({ _sum: { amountCents: true }, where: { status: { in: ["funded", "delivered", "disputed"] } } }),
        db.wallet.aggregate({ _sum: { availableCents: true }, where: { status: "active" } }),
        db.financialTransaction.aggregate({ _sum: { amountCents: true }, where: { type: "deposit", status: "completed", createdAt: { gte: monthStart } } }),
        db.financialTransaction.aggregate({ _sum: { amountCents: true }, where: { type: "escrow_refund", status: "completed", createdAt: { gte: monthStart } } }),
      ]),
      // Communities
      Promise.all([
        db.cityGroup.count(),
        db.cityGroup.count({ where: { createdAt: { gte: monthStart } } }),
        db.groupMember.count({ where: { status: "active" } }),
      ]),
      // Top entities
      db.marketOrder.groupBy({
        by: ["sellerId"],
        _count: { _all: true },
        orderBy: { _count: { sellerId: "desc" } },
        take: 5,
      }),
      db.groupPost.groupBy({
        by: ["groupId"],
        _count: { _all: true },
        orderBy: { _count: { groupId: "desc" } },
        take: 5,
      }),
      db.product.findMany({ orderBy: { viewsCount: "desc" }, take: 5, select: { id: true, title: true, viewsCount: true } }),
      db.product.findMany({ orderBy: { favoritesCount: "desc" }, take: 5, select: { id: true, title: true, favoritesCount: true } }),
      db.service.findMany({ orderBy: { ratingAvg: "desc" }, take: 5, select: { id: true, title: true, ratingAvg: true } }),
    ]);

  return {
    users: {
      total: users[0],
      newToday: users[1],
      active30d: users[2],
      online: users[3],
      verified: users[4],
      pending: users[5],
      suspended: users[6],
      banned: users[7],
    },
    marketplace: {
      totalProducts: marketplace[0],
      totalServices: marketplace[1],
      totalRequests: marketplace[2],
      activeListings: marketplace[3],
      orders30d: marketplace[4],
      reviews30d: marketplace[5],
      mostViewed: mostViewed,
      mostSold: mostSold,
      topRated: topRated,
    },
    orders: {
      today: orders[0],
      week: orders[1],
      month: orders[2],
      completed: orders[3],
      cancelled: orders[4],
      refunded: orders[5],
      disputed: orders[6],
    },
    deals: {
      active: deals[0],
      completed: deals[1],
      cancelled: deals[2],
    },
    finance: {
      revenueTodayCents: finance[0]._sum.platformFeeCents ?? 0,
      revenueWeekCents: finance[1]._sum.platformFeeCents ?? 0,
      revenueMonthCents: finance[2]._sum.platformFeeCents ?? 0,
      commissionTotalCents: finance[3]._sum.platformFeeCents ?? 0,
      escrowBalanceCents: finance[4]._sum.amountCents ?? 0,
      walletBalanceCents: finance[5]._sum.availableCents ?? 0,
      depositsMonthCents: finance[6]._sum.amountCents ?? 0,
      refundsMonthCents: finance[7]._sum.amountCents ?? 0,
    },
    communities: {
      groups: communities[0],
      newGroups: communities[1],
      activeMembers: communities[2],
      mostActive: topGroups,
    },
    topSellers,
  };
}

export type PaymentFilters = {
  from?: string;
  to?: string;
  userId?: string;
  type?: string;
  status?: string;
  paymentMethod?: string;
};

export async function getFinanceDashboard(filters: PaymentFilters = {}) {
  const monthStart = daysAgo(30);

  const dateFilter: Record<string, Date> = {};
  if (filters.from) dateFilter.gte = new Date(filters.from);
  if (filters.to) dateFilter.lte = new Date(filters.to);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const where: Record<string, unknown> = {};

  if (hasDateFilter) where.createdAt = dateFilter;
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.userId) where.OR = [{ actorUserId: filters.userId }, { counterpartyUserId: filters.userId }];

  const [
    totalWalletBalance,
    lockedEscrow,
    releasedFunds,
    pendingPayments,
    failedPayments,
    refundedPayments,
    platformCommission,
    recentTransactions,
    depositSum,
  ] = await Promise.all([
    db.wallet.aggregate({ _sum: { availableCents: true }, where: { status: "active" } }),
    db.escrow.aggregate({ _sum: { amountCents: true }, where: { status: { in: ["funded", "delivered", "disputed"] } } }),
    db.financialTransaction.aggregate({ _sum: { amountCents: true }, where: { type: "escrow_release", status: "completed" } }),
    db.financialTransaction.aggregate({ _sum: { amountCents: true }, where: { status: "pending" } }),
    db.financialTransaction.aggregate({ _sum: { amountCents: true }, where: { status: "failed" } }),
    db.financialTransaction.aggregate({ _sum: { amountCents: true }, where: { type: "escrow_refund", status: "completed" } }),
    db.marketOrder.aggregate({ _sum: { platformFeeCents: true }, where: { status: { in: ["completed", "refunded"] } } }),
    db.financialTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        fromWallet: { include: { user: { select: { profile: { select: { displayName: true, username: true } } } } } },
        toWallet: { include: { user: { select: { profile: { select: { displayName: true, username: true } } } } } },
      },
    }),
    db.financialTransaction.aggregate({ _sum: { amountCents: true }, where: { type: "deposit", status: "completed", createdAt: { gte: monthStart } } }),
  ]);

  const txWhereForCount: Record<string, unknown> = {};
  if (hasDateFilter) txWhereForCount.createdAt = dateFilter;
  if (filters.type) txWhereForCount.type = filters.type;
  if (filters.status) txWhereForCount.status = filters.status;

  const totalTx = await db.financialTransaction.count({ where: txWhereForCount });

  return {
    totalWalletBalanceCents: totalWalletBalance._sum.availableCents ?? 0,
    lockedEscrowCents: lockedEscrow._sum.amountCents ?? 0,
    releasedFundsCents: releasedFunds._sum.amountCents ?? 0,
    pendingPaymentsCents: pendingPayments._sum.amountCents ?? 0,
    failedPaymentsCents: failedPayments._sum.amountCents ?? 0,
    refundedPaymentsCents: refundedPayments._sum.amountCents ?? 0,
    platformCommissionCents: platformCommission._sum.platformFeeCents ?? 0,
    depositsMonthCents: depositSum._sum.amountCents ?? 0,
    recentTransactions,
    totalTx,
  };
}
