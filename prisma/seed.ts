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

  // Seed 33 Dutch city groups (idempotent upsert)
  const { ensureDefaultCities } = await import("../src/server/marketplace/group-service");
  await ensureDefaultCities();

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
        title: "iPhone 13 â€” excellent condition",
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
          title: "Home cleaning â€” Amsterdam",
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

  // â”€â”€â”€ Admin platform (RBAC, settings, CMS, email templates) â”€â”€â”€

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

  // Default Super Admin user (both AdminUser + marketplace User)
  const superRole = await db.adminRole.findUnique({ where: { key: "super_admin" } });
  if (superRole) {
    await db.adminUser.upsert({
      where: { email: "aak@khadamatak.com" },
      create: {
        email: "aak@khadamatak.com",
        passwordHash,
        name: "Platform Admin",
        roleId: superRole.id,
        twoFactorEnabled: false,
      },
      update: { roleId: superRole.id },
    });

    // Also create the marketplace User identity so the admin can log in
    // through the normal login form (NextAuth authorize checks User table).
    const adminUsername = "admin";
    const existingUser = await db.user.findUnique({ where: { email: "aak@khadamatak.com" } });
    if (!existingUser) {
      await db.user.create({
        data: {
          email: "aak@khadamatak.com",
          passwordHash,
          role: "super_admin",
          emailVerified: new Date(),
          locale: "ar",
          profile: {
            create: {
              username: adminUsername,
              displayName: "Platform Admin",
            },
          },
          verification: {
            create: {
              status: "verified",
              emailConfirmed: true,
              phoneConfirmed: true,
              termsAcceptedAt: new Date(),
            },
          },
        },
      });
    } else {
      // Ensure password hash matches AdminUser so login works
      await db.user.update({
        where: { email: "aak@khadamatak.com" },
        data: { passwordHash, role: "super_admin" },
      });
    }
  }

  // Feature flags
  const flags = [
    { key: "marketplace", label: "Marketplace", description: "Products and services", enabled: true },
    { key: "jobs", label: "Jobs", description: "Job listings", enabled: true },
    { key: "social_feed", label: "Social feed", description: "Posts, comments and likes", enabled: true },
    { key: "chat", label: "Messaging", description: "User-to-user conversations", enabled: true },
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
    { key: "welcome", name: "Welcome", subject: { ar: "Ù…Ø±Ø­Ø¨Ù‹Ø§ Ø¨Ùƒ ÙÙŠ Ø®Ø¯Ù…Ø§ØªÙƒ", nl: "Welkom bij Khadamatak" }, body: { ar: "Ù…Ø±Ø­Ø¨Ù‹Ø§ {{name}}ØŒ ÙŠØ³Ø¹Ø¯Ù†Ø§ Ø§Ù†Ø¶Ù…Ø§Ù…Ùƒ!", nl: "Hallo {{name}}, welkom bij Khadamatak!" } },
    { key: "verification_approved", name: "Verification approved", subject: { ar: "ØªÙ… ØªÙˆØ«ÙŠÙ‚ Ø­Ø³Ø§Ø¨Ùƒ", nl: "Uw account is geverifieerd" }, body: { ar: "ØªÙ… ØªÙˆØ«ÙŠÙ‚ Ø­Ø³Ø§Ø¨Ùƒ Ø¨Ù†Ø¬Ø§Ø­.", nl: "Uw account is succesvol geverifieerd." } },
    { key: "password_reset", name: "Password reset", subject: { ar: "Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±", nl: "Wachtwoord resetten" }, body: { ar: "Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø±Ù…Ø² {{code}} Ù„Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±.", nl: "Gebruik code {{code}} om uw wachtwoord te resetten." } },
  ];
  for (const t of emailTemplates) {
    await db.emailTemplate.upsert({
      where: { key: t.key },
      create: {
        key: t.key,
        name: t.name,
        subjectJson: JSON.stringify(t.subject),
        bodyJson: JSON.stringify(t.body),
        variables: JSON.stringify(["name", "code"]),
        enabled: true,
      },
      update: { name: t.name, subjectJson: JSON.stringify(t.subject), bodyJson: JSON.stringify(t.body) },
    });
  }

  // CMS pages
  const cmsPages = [
    { slug: "about", title: { ar: "Ø¹Ù† Ø®Ø¯Ù…Ø§ØªÙƒ", nl: "Over Khadamatak" }, content: { ar: "Ù…Ù†ØµØ© ØªØ¬Ù…Ø¹ Ø§Ù„Ù…Ø¬ØªÙ…Ø¹Ø§Øª Ø§Ù„Ù…Ø­Ù„ÙŠØ© Ù„Ù„Ø¨ÙŠØ¹ ÙˆØ§Ù„Ø´Ø±Ø§Ø¡ ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª.", nl: "Het platform voor lokale koop, verkoop en diensten." } },
    { slug: "terms", title: { ar: "Ø§Ù„Ø´Ø±ÙˆØ· ÙˆØ§Ù„Ø£Ø­ÙƒØ§Ù…", nl: "Algemene voorwaarden" }, content: { ar: "Ø´Ø±ÙˆØ· Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ù†ØµØ© Ø®Ø¯Ù…Ø§ØªÙƒ.", nl: "Gebruiksvoorwaarden van Khadamatak." } },
    { slug: "privacy", title: { ar: "Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø®ØµÙˆØµÙŠØ©", nl: "Privacybeleid" }, content: { ar: "ÙƒÙŠÙ Ù†Ø­Ù…ÙŠ Ø¨ÙŠØ§Ù†Ø§ØªÙƒ.", nl: "Hoe wij uw gegevens beschermen." } },
    { slug: "faq", title: { ar: "Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ø´Ø§Ø¦Ø¹Ø©", nl: "Veelgestelde vragen" }, content: { ar: "Ø£Ø¬ÙˆØ¨Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ø´Ø§Ø¦Ø¹Ø©.", nl: "Antwoorden op veelgestelde vragen." } },
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
    { key: "hero", heading: { ar: "Ø§Ø¹Ù…Ù„ ÙˆØ§Ø´ØªØ±Ù Ù…Ø­Ù„ÙŠÙ‹Ø§ Ø¨Ø£Ù…Ø§Ù†", nl: "Koop en verkoop lokaal, veilig" }, subheading: { ar: "ØªÙˆØ§ØµÙ„ØŒ ØªÙØ§ÙˆØ¶ØŒ ÙˆØªÙ…ØªØ¹ Ø¨ØªØ¬Ø±Ø¨Ø© Ø³ÙˆÙ‚ Ù…Ø­Ù„ÙŠØ© Ù…ÙˆØ«ÙˆÙ‚Ø©", nl: "Verbind, onderhandel en geniet van een betrouwbare lokale marktplaats" }, ctaLabel: { ar: "Ø§Ø¨Ø¯Ø£ Ø§Ù„Ø¢Ù†", nl: "Start nu" }, ctaHref: "/marketplace", enabled: true, sortOrder: 1 },
    { key: "how_it_works", heading: { ar: "ÙƒÙŠÙ ØªØ¹Ù…Ù„ØŸ", nl: "Hoe werkt het?" }, subheading: { ar: "Ø«Ù„Ø§Ø« Ø®Ø·ÙˆØ§Øª Ø¨Ø³ÙŠØ·Ø©", nl: "Drie simpele stappen" }, ctaLabel: { ar: "Ø§Ø¹Ø±Ù Ø§Ù„Ù…Ø²ÙŠØ¯", nl: "Lees meer" }, ctaHref: "/about", enabled: true, sortOrder: 2 },
    { key: "features", heading: { ar: "Ù…Ù…ÙŠØ²Ø§Øª Ø§Ù„Ù…Ù†ØµØ©", nl: "Platform functies" }, subheading: { ar: "ÙƒÙ„ Ù…Ø§ ØªØ­ØªØ§Ø¬Ù‡ ÙÙŠ Ù…ÙƒØ§Ù† ÙˆØ§Ø­Ø¯", nl: "Alles wat u nodig heeft op Ã©Ã©n plek" }, ctaHref: null, enabled: true, sortOrder: 3 },
    { key: "app_download", heading: { ar: "Ø­Ù…Ù‘Ù„ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚", nl: "Download de app" }, ctaLabel: { ar: "Ø±ÙˆØ§Ø¨Ø· Ø§Ù„ØªØ­Ù…ÙŠÙ„", nl: "Download links" }, ctaHref: "/download", enabled: false, sortOrder: 4 },
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
    { placement: "footer", label: { ar: "Ø¹Ù† Ø§Ù„Ù…Ù†ØµØ©", nl: "Over ons" }, href: "/about", sortOrder: 1 },
    { placement: "footer", label: { ar: "Ø§Ù„Ø´Ø±ÙˆØ·", nl: "Voorwaarden" }, href: "/terms", sortOrder: 2 },
    { placement: "footer", label: { ar: "Ø§Ù„Ø®ØµÙˆØµÙŠØ©", nl: "Privacy" }, href: "/privacy", sortOrder: 3 },
    { placement: "footer", label: { ar: "Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ø´Ø§Ø¦Ø¹Ø©", nl: "FAQ" }, href: "/faq", sortOrder: 4 },
  ];
  for (const m of menuItems) {
    const existing = await db.cmsMenuItem.findFirst({ where: { placement: m.placement, href: m.href } });
    if (!existing) {
      await db.cmsMenuItem.create({ data: { placement: m.placement, labelJson: JSON.stringify(m.label), href: m.href, sortOrder: m.sortOrder } });
    } else {
      await db.cmsMenuItem.update({ where: { id: existing.id }, data: { labelJson: JSON.stringify(m.label), sortOrder: m.sortOrder } });
    }
  }

  console.log("Seed complete. demo@khadamatak.com / Password123!  â€¢  aak@khadamatak.com / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

