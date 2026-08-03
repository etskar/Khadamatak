import "server-only";
import { db } from "@/lib/db";

/** Read-only analytics view for the admin dashboard. */
export async function getAdminAnalytics() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const since7d = new Date(Date.now() - 7 * 86400000);

  const [
    userCount,
    newUsersToday,
    activeProducts,
    activeServices,
    activeGroups,
    totalPosts,
    newUsers7d,
    reportCount,
    newGroups7d,
    newPosts7d,
    totalListings,
    newListings7d,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: startOfDay } } }),
    db.product.count({ where: { status: "active", hiddenAt: null } }),
    db.service.count({ where: { status: "active", hiddenAt: null } }),
    db.cityGroup.count({ where: { status: "active" } }),
    db.post.count({ where: { hiddenAt: null } }),
    db.user.count({ where: { createdAt: { gte: since7d } } }),
    db.report.count({ where: { status: "open" } }),
    db.cityGroup.count({ where: { createdAt: { gte: since7d } } }),
    db.post.count({ where: { createdAt: { gte: since7d } } }),
    db.product.count({ where: { hiddenAt: null } }),
    Promise.all([
      db.product.count({ where: { createdAt: { gte: since7d } } }),
      db.service.count({ where: { createdAt: { gte: since7d } } }),
    ]).then(([a, b]) => a + b),
  ]);

  return {
    users: { total: userCount, newToday: newUsersToday, new7d: newUsers7d },
    marketplace: {
      activeProducts,
      activeServices,
      totalListings,
      newListings7d,
    },
    community: { activeGroups, totalPosts, newGroups7d, newPosts7d },
    health: { openReports: reportCount },
  };
}
