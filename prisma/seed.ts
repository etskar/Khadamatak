import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const users = [
    {
      email: "demo@khadamatak.com",
      username: "demo",
      displayName: "Demo User",
      locale: "ar",
      verified: true,
    },
    {
      email: "seller@khadamatak.com",
      username: "seller",
      displayName: "Seller Pro",
      locale: "nl",
      verified: true,
    },
  ];

  for (const u of users) {
    const existing = await db.user.findUnique({ where: { email: u.email } });
    if (existing) continue;

    const user = await db.user.create({
      data: {
        email: u.email,
        passwordHash,
        emailVerified: new Date(),
        phone: "+31600000000",
        phoneVerifiedAt: new Date(),
        realName: u.displayName,
        locale: u.locale,
        profile: {
          create: {
            username: u.username,
            displayName: u.displayName,
            bio: "Khadamatak demo account",
            city: "Amsterdam",
            country: "NL",
          },
        },
        verification: {
          create: {
            status: u.verified ? "verified" : "not_started",
            fullName: u.displayName,
            emailConfirmed: true,
            phoneConfirmed: true,
            termsAcceptedAt: new Date(),
            submittedAt: new Date(),
            reviewedAt: new Date(),
          },
        },
        wallet: {
          create: {
            walletId: `KH-${u.username.toUpperCase()}01`,
            walletUsername: u.username,
            availableCents: 50_000,
          },
        },
      },
    });

    await db.post.create({
      data: {
        authorId: user.id,
        content: `Welcome to Khadamatak! #khadamatak @${u.username}`,
      },
    });
  }

  // Categories
  const cats = [
    { slug: "electronics", nameAr: "إلكترونيات", nameNl: "Elektronica", kind: "product", sortOrder: 1 },
    { slug: "furniture", nameAr: "أثاث", nameNl: "Meubels", kind: "product", sortOrder: 2 },
    { slug: "cleaning", nameAr: "تنظيف", nameNl: "Schoonmaak", kind: "service", sortOrder: 1 },
    { slug: "transport", nameAr: "نقل", nameNl: "Transport", kind: "service", sortOrder: 2 },
    { slug: "moving", nameAr: "نقل عفش", nameNl: "Verhuizen", kind: "request", sortOrder: 1 },
  ];
  for (const c of cats) {
    await db.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: c,
    });
  }

  await db.platformSettings.upsert({
    where: { id: "default" },
    create: { id: "default", feePercentBps: 500 },
    update: {},
  });

  const cities = [
    { slug: "amsterdam", name: "Amsterdam", nameAr: "أمستردام", nameNl: "Amsterdam", lat: 52.3676, lng: 4.9041 },
    { slug: "rotterdam", name: "Rotterdam", nameAr: "روتردام", nameNl: "Rotterdam", lat: 51.9244, lng: 4.4777 },
    { slug: "utrecht", name: "Utrecht", nameAr: "أوتريخت", nameNl: "Utrecht", lat: 52.0907, lng: 5.1214 },
    { slug: "groningen", name: "Groningen", nameAr: "خرونينغن", nameNl: "Groningen", lat: 53.2194, lng: 6.5665 },
  ];
  for (const c of cities) {
    await db.cityGroup.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        nameAr: c.nameAr,
        nameNl: c.nameNl,
        city: c.name,
        country: "NL",
        latitude: c.lat,
        longitude: c.lng,
        requiresVerification: true,
        description: `${c.name} community`,
      },
      update: { latitude: c.lat, longitude: c.lng },
    });
  }

  const seller = await db.user.findUnique({
    where: { email: "seller@khadamatak.com" },
    include: { products: true },
  });
  const electronics = await db.category.findUnique({ where: { slug: "electronics" } });
  const cleaning = await db.category.findUnique({ where: { slug: "cleaning" } });

  if (seller && seller.products.length === 0 && electronics) {
    await db.product.create({
      data: {
        publicId: "KH-PD-DEMO00001",
        sellerId: seller.id,
        categoryId: electronics.id,
        title: "iPhone 13 — excellent condition",
        description: "Demo product for Khadamatak marketplace. Secure escrow checkout.",
        priceCents: 35000,
        condition: "like_new",
        status: "active",
        city: "Amsterdam",
        country: "NL",
        latitude: 52.37,
        longitude: 4.89,
        publishedAt: new Date(),
      },
    });
  }

  if (seller && cleaning) {
    const existingService = await db.service.findFirst({
      where: { providerId: seller.id },
    });
    if (!existingService) {
      await db.service.create({
        data: {
          publicId: "KH-SV-DEMO00001",
          providerId: seller.id,
          categoryId: cleaning.id,
          title: "Home cleaning — Amsterdam",
          description: "Professional cleaning service. Book securely with escrow.",
          priceCents: 4500,
          pricingType: "fixed",
          status: "active",
          city: "Amsterdam",
          country: "NL",
          latitude: 52.36,
          longitude: 4.9,
          availability: "Mon-Sat",
          publishedAt: new Date(),
        },
      });
    }
  }

  // ─── Admin platform (RBAC, settings, CMS, email templates) ───

  // Permissions
  for (const p of await import("../src/types/admin").then((m) => m.ADMIN_PERMISSIONS)) {
    await db.adminPermission.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        category: p.category,
        label: p.label,
        labelAr: p.labelAr,
        labelNl: p.labelNl,
        description: p.description,
      },
      update: { category: p.category, label: p.label, labelAr: p.labelAr, labelNl: p.labelNl },
    });
  }

  // Roles
  const roles = (await import("../src/types/admin")).DEFAULT_ADMIN_ROLES;
  for (const r of roles) {
    const role = await db.adminRole.upsert({
      where: { key: r.key },
      create: {
        key: r.key,
        name: r.name,
        nameAr: r.nameAr,
        nameNl: r.nameNl,
        description: r.description,
        isSystem: true,
      },
      update: { name: r.name, nameAr: r.nameAr, nameNl: r.nameNl, description: r.description },
    });
    for (const permKey of r.permissions) {
      const perm = await db.adminPermission.findUnique({ where: { key: permKey } });
      if (!perm) continue;
      await db.adminRolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  // Default Super Admin user
  const superRole = await db.adminRole.findUnique({ where: { key: "super_admin" } });
  if (superRole) {
    await db.adminUser.upsert({
      where: { email: "admin@khadamatak.com" },
      create: {
        email: "admin@khadamatak.com",
        passwordHash,
        name: "Platform Admin",
        roleId: superRole.id,
        twoFactorEnabled: false,
      },
      update: { roleId: superRole.id },
    });
  }

  // Feature flags
  const flags = [
    { key: "marketplace", label: "Marketplace", description: "Products, services and requests", enabled: true },
    { key: "escrow", label: "Escrow payments", description: "Secure escrow checkout", enabled: true },
    { key: "social_feed", label: "Social feed", description: "Posts, comments and likes", enabled: true },
    { key: "chat", label: "Messaging", description: "User-to-user conversations", enabled: true },
    { key: "payments_in", label: "Payments in", description: "Deposits via iDEAL etc.", enabled: true },
    { key: "withdrawals", label: "Withdrawals", description: "Wallet payout", enabled: true },
    { key: "reviews", label: "Reviews", description: "Post-order reviews", enabled: true },
    { key: "groups", label: "City groups", description: "Community groups", enabled: true },
    { key: "notifications", label: "Notifications", description: "In-app notifications", enabled: true },
    { key: "announcements", label: "Announcements", description: "Admin announcements", enabled: true },
  ];
  for (const f of flags) {
    await db.featureFlag.upsert({
      where: { key: f.key },
      create: f,
      update: { label: f.label, description: f.description, enabled: f.enabled },
    });
  }

  // System settings
  const systemSettings: { key: string; value: unknown; category: string; description?: string }[] = [
    { key: "platform_name", value: "Khadamatak", category: "general", description: "Display name of the platform" },
    { key: "support_email", value: "support@khadamatak.com", category: "email", description: "Customer support inbox" },
    { key: "support_phone", value: "+31612345678", category: "general" },
    { key: "kyc_min_amount_cents", value: 1000, category: "verification", description: "Min escrow amount requiring KYC" },
    { key: "auto_payout_enabled", value: true, category: "wallet", description: "Automatic seller payouts" },
    { key: "escrow_timers_json", value: JSON.stringify({ confirm_hours: 24, auto_release_hours: 72 }), category: "escrow" },
    { key: "max_withdrawal_daily_cents", value: 500000, category: "wallet" },
  ];
  for (const s of systemSettings) {
    await db.systemSetting.upsert({
      where: { key: s.key },
      create: { key: s.key, valueJson: JSON.stringify(s.value), category: s.category, description: s.description },
      update: { valueJson: JSON.stringify(s.value), category: s.category, description: s.description },
    });
  }

  // Email templates
  const emailTemplates = [
    { key: "welcome", name: "Welcome", subject: { ar: "مرحبًا بك في خدماتك", nl: "Welkom bij Khadamatak" }, body: { ar: "مرحبًا {{name}}، يسعدنا انضمامك!", nl: "Hallo {{name}}, welkom bij Khadamatak!" } },
    { key: "verification_approved", name: "Verification approved", subject: { ar: "تم توثيق حسابك", nl: "Uw account is geverifieerd" }, body: { ar: "تم توثيق حسابك بنجاح.", nl: "Uw account is succesvol geverifieerd." } },
    { key: "order_confirmed", name: "Order confirmed", subject: { ar: "تم تأكيد طلبك", nl: "Uw bestelling is bevestigd" }, body: { ar: "طلبك رقم {{orderId}} مؤكد ومبلغه محفوظ في الضمان.", nl: "Bestelling {{orderId}} is bevestigd en veilig onder escrow geplaatst." } },
    { key: "escrow_released", name: "Escrow released", subject: { ar: "تم تحرير الدفعة", nl: "Betaling vrijgegeven" }, body: { ar: "تم تحرير مبلغ {{amount}} إلى محفظتك.", nl: "{{amount}} is aan uw portemonnee toegevoegd." } },
    { key: "password_reset", name: "Password reset", subject: { ar: "إعادة تعيين كلمة المرور", nl: "Wachtwoord resetten" }, body: { ar: "استخدم الرمز {{code}} لإعادة تعيين كلمة المرور.", nl: "Gebruik code {{code}} om uw wachtwoord te resetten." } },
    { key: "dispute_opened", name: "Dispute opened", subject: { ar: "تم فتح نزاع", nl: "Geschil geopend" }, body: { ar: "تم فتح نزاع بخصوص الطلب {{orderId}}.", nl: "Er is een geschil geopend voor bestelling {{orderId}}." } },
  ];
  for (const t of emailTemplates) {
    await db.emailTemplate.upsert({
      where: { key: t.key },
      create: {
        key: t.key,
        name: t.name,
        subjectJson: JSON.stringify(t.subject),
        bodyJson: JSON.stringify(t.body),
        variables: JSON.stringify(["name", "code", "orderId", "amount"]),
        enabled: true,
      },
      update: { name: t.name, subjectJson: JSON.stringify(t.subject), bodyJson: JSON.stringify(t.body) },
    });
  }

  // CMS pages
  const cmsPages = [
    { slug: "about", title: { ar: "عن خدماتك", nl: "Over Khadamatak" }, content: { ar: "منصة تجمع المجتمعات المحلية للبيع والشراء والخدمات.", nl: "Het platform voor lokale koop, verkoop en diensten." } },
    { slug: "terms", title: { ar: "الشروط والأحكام", nl: "Algemene voorwaarden" }, content: { ar: "شروط استخدام منصة خدماتك.", nl: "Gebruiksvoorwaarden van Khadamatak." } },
    { slug: "privacy", title: { ar: "سياسة الخصوصية", nl: "Privacybeleid" }, content: { ar: "كيف نحمي بياناتك.", nl: "Hoe wij uw gegevens beschermen." } },
    { slug: "faq", title: { ar: "الأسئلة الشائعة", nl: "Veelgestelde vragen" }, content: { ar: "أجوبة على الأسئلة الشائعة.", nl: "Antwoorden op veelgestelde vragen." } },
  ];
  for (const p of cmsPages) {
    const existing = await db.cmsPage.findUnique({ where: { slug: p.slug } });
    if (!existing) {
      await db.cmsPage.create({
        data: { slug: p.slug, titleJson: JSON.stringify(p.title), contentJson: JSON.stringify(p.content), status: "published", publishedAt: new Date() },
      });
    }
  }

  // CMS sections
  const sections = [
    { key: "hero", heading: { ar: "اعمل واشترِ محليًا بأمان", nl: "Koop en verkoop lokaal, veilig" }, subheading: { ar: "مدفوعات مضمونة عبر الضمان", nl: "Veilig betalen via escrow" }, ctaLabel: { ar: "ابدأ الآن", nl: "Start nu" }, ctaHref: "/marketplace", enabled: true, sortOrder: 1 },
    { key: "how_it_works", heading: { ar: "كيف تعمل؟", nl: "Hoe werkt het?" }, subheading: { ar: "ثلاث خطوات بسيطة", nl: "Drie simpele stappen" }, ctaLabel: { ar: "اعرف المزيد", nl: "Lees meer" }, ctaHref: "/about", enabled: true, sortOrder: 2 },
    { key: "features", heading: { ar: "مميزات المنصة", nl: "Platform functies" }, subheading: { ar: "كل ما تحتاجه في مكان واحد", nl: "Alles wat u nodig heeft op één plek" }, ctaHref: null, enabled: true, sortOrder: 3 },
    { key: "app_download", heading: { ar: "حمّل التطبيق", nl: "Download de app" }, ctaLabel: { ar: "روابط التحميل", nl: "Download links" }, ctaHref: "/download", enabled: false, sortOrder: 4 },
  ];
  for (const s of sections) {
    await db.cmsSection.upsert({
      where: { key: s.key },
      create: {
        key: s.key,
        headingJson: JSON.stringify(s.heading),
        subheadingJson: JSON.stringify(s.subheading),
        ctaLabelJson: s.ctaLabel ? JSON.stringify(s.ctaLabel) : null,
        ctaHref: s.ctaHref,
        enabled: s.enabled,
        sortOrder: s.sortOrder,
      },
      update: {
        headingJson: JSON.stringify(s.heading),
        subheadingJson: JSON.stringify(s.subheading),
        ctaLabelJson: s.ctaLabel ? JSON.stringify(s.ctaLabel) : null,
        ctaHref: s.ctaHref,
        enabled: s.enabled,
        sortOrder: s.sortOrder,
      },
    });
  }

  // CMS menu
  const menuItems = [
    { placement: "footer", label: { ar: "عن المنصة", nl: "Over ons" }, href: "/about", sortOrder: 1 },
    { placement: "footer", label: { ar: "الشروط", nl: "Voorwaarden" }, href: "/terms", sortOrder: 2 },
    { placement: "footer", label: { ar: "الخصوصية", nl: "Privacy" }, href: "/privacy", sortOrder: 3 },
    { placement: "footer", label: { ar: "الأسئلة الشائعة", nl: "FAQ" }, href: "/faq", sortOrder: 4 },
  ];
  for (const m of menuItems) {
    const existing = await db.cmsMenuItem.findFirst({ where: { placement: m.placement, href: m.href } });
    if (!existing) {
      await db.cmsMenuItem.create({ data: { placement: m.placement, labelJson: JSON.stringify(m.label), href: m.href, sortOrder: m.sortOrder } });
    } else {
      await db.cmsMenuItem.update({ where: { id: existing.id }, data: { labelJson: JSON.stringify(m.label), sortOrder: m.sortOrder } });
    }
  }

  console.log("Seed complete. demo@khadamatak.com / Password123!  •  admin@khadamatak.com / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
