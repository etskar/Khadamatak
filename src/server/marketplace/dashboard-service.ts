import "server-only";
import { db } from "@/lib/db";

export async function getSellerDashboard(userId: string) {
  const [products, services, jobs, productViews, serviceViews, jobViews] =
    await Promise.all([
      db.product.findMany({
        where: { sellerId: userId, status: { not: "deleted" } },
        include: { media: true, _count: { select: { favorites: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.service.findMany({
        where: { providerId: userId, status: { not: "deleted" } },
        include: { media: true, _count: { select: { favorites: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.job.findMany({
        where: { employerId: userId, status: { not: "deleted" } },
        include: { media: true },
        orderBy: { createdAt: "desc" },
      }),
      db.product.aggregate({
        where: { sellerId: userId },
        _sum: { viewsCount: true, favoritesCount: true },
      }),
      db.service.aggregate({
        where: { providerId: userId },
        _sum: { viewsCount: true, favoritesCount: true },
      }),
      db.job.aggregate({
        where: { employerId: userId },
        _sum: { viewsCount: true },
      }),
    ]);

  return {
    products,
    services,
    jobs,
    stats: {
      views:
        (productViews._sum.viewsCount ?? 0) +
        (serviceViews._sum.viewsCount ?? 0) +
        (jobViews._sum.viewsCount ?? 0),
      favorites:
        (productViews._sum.favoritesCount ?? 0) +
        (serviceViews._sum.favoritesCount ?? 0),
      activeListings:
        products.filter((p) => p.status === "active").length +
        services.filter((s) => s.status === "active").length +
        jobs.filter((j) => j.status === "active").length,
    },
  };
}

export async function ensureCategories() {
  const cats: { slug: string; nameAr: string; nameNl: string; kind: string; sortOrder: number }[] = [
    { slug: "electronics", nameAr: "إلكترونيات", nameNl: "Elektronica", kind: "product", sortOrder: 1 },
    { slug: "furniture", nameAr: "أثاث", nameNl: "Meubels", kind: "product", sortOrder: 2 },
    { slug: "cars", nameAr: "سيارات", nameNl: "Auto's", kind: "product", sortOrder: 3 },
    { slug: "clothing", nameAr: "ملابس", nameNl: "Kleding", kind: "product", sortOrder: 4 },
    { slug: "home", nameAr: "منزل", nameNl: "Huis", kind: "product", sortOrder: 5 },
    { slug: "children", nameAr: "أطفال", nameNl: "Kinderen", kind: "product", sortOrder: 6 },
    { slug: "sports", nameAr: "رياضة", nameNl: "Sport", kind: "product", sortOrder: 7 },
    { slug: "animals", nameAr: "حيوانات", nameNl: "Dieren", kind: "product", sortOrder: 8 },
    { slug: "digital", nameAr: "منتجات رقمية", nameNl: "Digitaal", kind: "product", sortOrder: 9 },
    { slug: "other-products", nameAr: "أخرى", nameNl: "Overig", kind: "product", sortOrder: 99 },
    { slug: "cleaning", nameAr: "تنظيف", nameNl: "Schoonmaak", kind: "service", sortOrder: 1 },
    { slug: "transport", nameAr: "نقل", nameNl: "Transport", kind: "service", sortOrder: 2 },
    { slug: "repair", nameAr: "صيانة", nameNl: "Reparatie", kind: "service", sortOrder: 3 },
    { slug: "teaching", nameAr: "تعليم", nameNl: "Lesgeven", kind: "service", sortOrder: 4 },
    { slug: "freelance", nameAr: "عمل حر", nameNl: "Freelance", kind: "service", sortOrder: 5 },
    { slug: "design", nameAr: "تصميم", nameNl: "Design", kind: "service", sortOrder: 6 },
    { slug: "programming", nameAr: "برمجة", nameNl: "Programmeren", kind: "service", sortOrder: 7 },
    { slug: "home-services", nameAr: "خدمات منزلية", nameNl: "Huishoudelijke diensten", kind: "service", sortOrder: 8 },
    { slug: "consulting", nameAr: "استشارات", nameNl: "Consultancy", kind: "service", sortOrder: 9 },
  ];

  for (const c of cats) {
    await db.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { nameAr: c.nameAr, nameNl: c.nameNl, kind: c.kind, sortOrder: c.sortOrder },
    });
  }

  await db.platformSettings.upsert({
    where: { id: "default" },
    create: { id: "default", feePercentBps: 500, feeFixedCents: 0 },
    update: {},
  });
}
