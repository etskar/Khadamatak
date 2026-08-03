import "server-only";
import { db } from "@/lib/db";

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
    totalGroups,
    activeMembers,
    totalMessages,
    supportTickets,
    reportsWaiting,
    mappedListings,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { lastActiveAt: { gt: onlineSince }, accountStatus: "active" } }),
    db.identityVerification.count({ where: { status: "verified" } }),
    db.identityVerification.count({ where: { status: "pending" } }),
    db.product.count({ where: { status: "active", hiddenAt: null } }),
    db.service.count({ where: { status: "active", hiddenAt: null } }),
    db.cityGroup.count(),
    db.groupMember.count({ where: { status: "active" } }),
    db.message.count(),
    db.supportTicket.count({ where: { status: { in: ["open", "assigned", "in_progress", "pending"] } } }),
    db.report.count({ where: { status: { in: ["open", "reviewing"] } } }),
    db.product.count({ where: { latitude: { not: null }, longitude: { not: null }, status: { not: "deleted" } } }),
  ]);

  return {
    totalUsers,
    onlineUsers,
    verifiedUsers,
    pendingVerifications,
    activeProducts,
    activeServices,
    totalListings: activeProducts + activeServices,
    totalGroups,
    activeMembers,
    totalMessages,
    supportTickets,
    reportsWaiting,
    mappedListings,
    newUsers30d: await db.user.count({ where: { createdAt: { gte: daysAgo(30) } } }),
  };
}
