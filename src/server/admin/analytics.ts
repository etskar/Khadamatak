import "server-only";
import { db } from "@/lib/db";

/** Read-only analytics view for the admin dashboard (Part 2). */
export async function getAdminAnalytics() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const since7d = new Date(Date.now() - 7 * 86400000);

  const [
    userCount,
    newUsersToday,
    totalOrders,
    revenueCents,
    avgOrderCents,
    completedOrders,
    totalDeals,
    activeGroups,
    totalPosts,
    newUsers7d,
    revenue7d,
    reportCount,
    disputeCount,
    newGroups7d,
    newPosts7d,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: startOfDay } } }),
    db.marketOrder.count(),
    db.financialTransaction.aggregate({ _sum: { amountCents: true }, where: { type: "escrow_release", status: "completed" } }),
    db.marketOrder.aggregate({ _avg: { amountCents: true } }),
    db.marketOrder.count({ where: { status: "completed" } }),
    db.deal.count(),
    db.cityGroup.count({ where: { status: "active" } }),
    db.post.count({ where: { hiddenAt: null } }),
    db.user.count({ where: { createdAt: { gte: since7d } } }),
    db.financialTransaction.aggregate({
      _sum: { amountCents: true },
      where: { type: "escrow_release", status: "completed", createdAt: { gte: since7d } },
    }),
    db.report.count({ where: { status: "open" } }),
    db.dispute.count({ where: { status: "open" } }),
    db.cityGroup.count({ where: { createdAt: { gte: since7d } } }),
    db.post.count({ where: { createdAt: { gte: since7d } } }),
  ]);

  return {
    users: { total: userCount, newToday: newUsersToday, new7d: newUsers7d },
    marketplace: { totalOrders, completedOrders, avgOrderCents: avgOrderCents._avg.amountCents ?? 0 },
    finance: { totalRevenueCents: revenueCents._sum.amountCents ?? 0, revenue7dCents: revenue7d._sum.amountCents ?? 0 },
    community: { activeGroups, totalPosts, newGroups7d, newPosts7d },
    health: { openReports: reportCount, openDisputes: disputeCount },
    deals: { total: totalDeals },
  };
}
