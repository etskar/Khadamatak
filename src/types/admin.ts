/**
 * Admin RBAC catalog — the source of truth for admin permissions.
 * Permissions are stored in the database (AdminPermission) so they can be
 * edited at runtime without code changes. This module only documents the
 * default catalog that is seeded into the database.
 */

export type AdminPermissionDef = {
  key: string;
  category: string;
  label: string;
  labelAr: string;
  labelNl: string;
  description?: string;
};

export const ADMIN_PERMISSION_CATEGORIES = [
  "dashboard",
  "users",
  "verification",
  "marketplace",
  "orders",
  "escrow",
  "wallets",
  "payments",
  "disputes",
  "reports",
  "moderation",
  "communities",
  "support",
  "settings",
  "analytics",
  "finance",
  "audit",
  "security",
  "fraud",
  "health",
  "cms",
  "announcements",
  "email",
  "notifications",
  "api",
  "backups",
  "files",
  "i18n",
  "flags",
  "performance",
  "rbac",
] as const;

export type AdminPermissionCategory = (typeof ADMIN_PERMISSION_CATEGORIES)[number];

export const ADMIN_PERMISSIONS: AdminPermissionDef[] = [
  // Dashboard
  { key: "dashboard.view", category: "dashboard", label: "View dashboard", labelAr: "عرض لوحة التحكم", labelNl: "Dashboard bekijken" },

  // Users
  { key: "users.view", category: "users", label: "View users", labelAr: "عرض المستخدمين", labelNl: "Gebruikers bekijken" },
  { key: "users.edit", category: "users", label: "Edit accounts", labelAr: "تعديل الحسابات", labelNl: "Accounts bewerken" },
  { key: "users.reset_password", category: "users", label: "Reset passwords", labelAr: "إعادة تعيين كلمات المرور", labelNl: "Wachtwoorden resetten" },
  { key: "users.verify", category: "users", label: "Verify accounts", labelAr: "توثيق الحسابات", labelNl: "Accounts verifiëren" },
  { key: "users.suspend", category: "users", label: "Suspend users", labelAr: "إيقاف المستخدمين", labelNl: "Gebruikers opschorten" },
  { key: "users.ban", category: "users", label: "Ban users", labelAr: "حظر المستخدمين", labelNl: "Gebruikers verbannen" },
  { key: "users.restore", category: "users", label: "Restore accounts", labelAr: "استعادة الحسابات", labelNl: "Accounts herstellen" },
  { key: "users.delete", category: "users", label: "Delete accounts", labelAr: "حذف الحسابات", labelNl: "Accounts verwijderen" },
  { key: "users.export", category: "users", label: "Export user data", labelAr: "تصدير بيانات المستخدم", labelNl: "Gebruikersdata exporteren" },

  // Verification
  { key: "verification.view", category: "verification", label: "View verification queue", labelAr: "عرض طلبات التوثيق", labelNl: "Verificatiewachtrij bekijken" },
  { key: "verification.approve", category: "verification", label: "Approve verification", labelAr: "الموافقة على التوثيق", labelNl: "Verificatie goedkeuren" },
  { key: "verification.reject", category: "verification", label: "Reject verification", labelAr: "رفض التوثيق", labelNl: "Verificatie afwijzen" },
  { key: "verification.request_info", category: "verification", label: "Request additional info", labelAr: "طلب معلومات إضافية", labelNl: "Extra informatie opvragen" },

  // Marketplace
  { key: "marketplace.view", category: "marketplace", label: "View listings", labelAr: "عرض القوائم", labelNl: "Advertenties bekijken" },
  { key: "marketplace.approve", category: "marketplace", label: "Approve listings", labelAr: "الموافقة على القوائم", labelNl: "Advertenties goedkeuren" },
  { key: "marketplace.reject", category: "marketplace", label: "Reject listings", labelAr: "رفض القوائم", labelNl: "Advertenties afwijzen" },
  { key: "marketplace.hide", category: "marketplace", label: "Hide listings", labelAr: "إخفاء القوائم", labelNl: "Advertenties verbergen" },
  { key: "marketplace.restore", category: "marketplace", label: "Restore listings", labelAr: "استعادة القوائم", labelNl: "Advertenties herstellen" },
  { key: "marketplace.delete", category: "marketplace", label: "Delete listings", labelAr: "حذف القوائم", labelNl: "Advertenties verwijderen" },
  { key: "marketplace.feature", category: "marketplace", label: "Feature listings", labelAr: "تثبيت مميز للقوائم", labelNl: "Advertenties uitlichten" },
  { key: "marketplace.pin", category: "marketplace", label: "Pin listings", labelAr: "تثبيت القوائم", labelNl: "Advertenties vastpinnen" },

  // Orders
  { key: "orders.view", category: "orders", label: "View orders", labelAr: "عرض الطلبات", labelNl: "Bestellingen bekijken" },
  { key: "orders.cancel", category: "orders", label: "Cancel orders", labelAr: "إلغاء الطلبات", labelNl: "Bestellingen annuleren" },
  { key: "orders.refund", category: "orders", label: "Refund orders", labelAr: "استرداد الطلبات", labelNl: "Bestellingen terugbetalen" },
  { key: "orders.complete", category: "orders", label: "Complete orders", labelAr: "إكمال الطلبات", labelNl: "Bestellingen voltooien" },
  { key: "orders.force_release", category: "orders", label: "Force release escrow", labelAr: "تحرير الضمان إجباريًا", labelNl: "Escrow geforceerd vrijgeven" },
  { key: "orders.force_refund", category: "orders", label: "Force refund", labelAr: "استرداد إجباري", labelNl: "Geforceerd terugbetalen" },

  // Escrow
  { key: "escrow.view", category: "escrow", label: "View escrows", labelAr: "عرض الضمانات", labelNl: "Escrows bekijken" },
  { key: "escrow.release", category: "escrow", label: "Release funds", labelAr: "تحرير الأموال", labelNl: "Gelden vrijgeven" },
  { key: "escrow.refund", category: "escrow", label: "Refund buyer", labelAr: "استرداد المشتري", labelNl: "Koper terugbetalen" },
  { key: "escrow.freeze", category: "escrow", label: "Freeze escrow", labelAr: "تجميد الضمان", labelNl: "Escrow bevriezen" },
  { key: "escrow.investigate", category: "escrow", label: "Investigate escrow", labelAr: "التحقيق في الضمان", labelNl: "Escrow onderzoeken" },

  // Wallets
  { key: "wallets.view", category: "wallets", label: "View wallets", labelAr: "عرض المحافظ", labelNl: "Portemonnees bekijken" },
  { key: "wallets.freeze", category: "wallets", label: "Freeze wallets", labelAr: "تجميد المحافظ", labelNl: "Portemonnees bevriezen" },
  { key: "wallets.unfreeze", category: "wallets", label: "Unfreeze wallets", labelAr: "إلغاء تجميد المحافظ", labelNl: "Portemonnees ontdooien" },
  { key: "wallets.export", category: "wallets", label: "Export wallet history", labelAr: "تصدير سجل المحفظة", labelNl: "Portemonnee-geschiedenis exporteren" },

  // Payments
  { key: "payments.view", category: "payments", label: "View payments", labelAr: "عرض المدفوعات", labelNl: "Betalingen bekijken" },
  { key: "payments.investigate", category: "payments", label: "Investigate payments", labelAr: "التحقيق في المدفوعات", labelNl: "Betalingen onderzoeken" },

  // Disputes
  { key: "disputes.view", category: "disputes", label: "View disputes", labelAr: "عرض النزاعات", labelNl: "Geschillen bekijken" },
  { key: "disputes.manage", category: "disputes", label: "Manage disputes", labelAr: "إدارة النزاعات", labelNl: "Geschillen beheren" },
  { key: "disputes.resolve", category: "disputes", label: "Resolve disputes", labelAr: "حسم النزاعات", labelNl: "Geschillen oplossen" },
  { key: "disputes.chat", category: "disputes", label: "Chat in disputes", labelAr: "المراسلة في النزاعات", labelNl: "Chatten in geschillen" },

  // Reports
  { key: "reports.view", category: "reports", label: "View reports", labelAr: "عرض البلاغات", labelNl: "Meldingen bekijken" },
  { key: "reports.resolve", category: "reports", label: "Resolve reports", labelAr: "حسم البلاغات", labelNl: "Meldingen oplossen" },
  { key: "reports.warn", category: "reports", label: "Warn users", labelAr: "تحذير المستخدمين", labelNl: "Gebruikers waarschuwen" },
  { key: "reports.remove_content", category: "reports", label: "Remove content", labelAr: "حذف المحتوى", labelNl: "Inhoud verwijderen" },

  // Moderation
  { key: "moderation.view", category: "moderation", label: "View content", labelAr: "عرض المحتوى", labelNl: "Inhoud bekijken" },
  { key: "moderation.manage", category: "moderation", label: "Hide/restore/delete content", labelAr: "إخفاء/استعادة/حذف المحتوى", labelNl: "Inhoud verbergen/herstellen/verwijderen" },
  { key: "moderation.lock_comments", category: "moderation", label: "Lock comments", labelAr: "قفل التعليقات", labelNl: "Reacties vergrendelen" },

  // Communities
  { key: "communities.view", category: "communities", label: "View communities", labelAr: "عرض المجتمعات", labelNl: "Gemeenschappen bekijken" },
  { key: "communities.manage", category: "communities", label: "Manage communities", labelAr: "إدارة المجتمعات", labelNl: "Gemeenschappen beheren" },
  { key: "communities.transfer_ownership", category: "communities", label: "Transfer ownership", labelAr: "نقل الملكية", labelNl: "Eigendom overdragen" },
  { key: "communities.remove_members", category: "communities", label: "Remove members", labelAr: "إزالة الأعضاء", labelNl: "Leden verwijderen" },
  { key: "communities.lock", category: "communities", label: "Lock groups", labelAr: "قفل المجموعات", labelNl: "Groepen vergrendelen" },
  { key: "communities.archive", category: "communities", label: "Archive groups", labelAr: "أرشفة المجموعات", labelNl: "Groepen archiveren" },

  // Support
  { key: "support.view", category: "support", label: "View tickets", labelAr: "عرض التذاكر", labelNl: "Tickets bekijken" },
  { key: "support.manage", category: "support", label: "Reply to tickets", labelAr: "الرد على التذاكر", labelNl: "Reageren op tickets" },
  { key: "support.assign", category: "support", label: "Assign tickets", labelAr: "تعيين التذاكر", labelNl: "Tickets toewijzen" },
  { key: "support.escalate", category: "support", label: "Escalate tickets", labelAr: "تصعيد التذاكر", labelNl: "Tickets escaleren" },
  { key: "support.merge", category: "support", label: "Merge tickets", labelAr: "دمج التذاكر", labelNl: "Tickets samenvoegen" },

  // Settings
  { key: "settings.view", category: "settings", label: "View settings", labelAr: "عرض الإعدادات", labelNl: "Instellingen bekijken" },
  { key: "settings.manage", category: "settings", label: "Manage settings", labelAr: "إدارة الإعدادات", labelNl: "Instellingen beheren" },

  // Analytics
  { key: "analytics.view", category: "analytics", label: "View analytics", labelAr: "عرض التحليلات", labelNl: "Analyses bekijken" },

  // Finance
  { key: "finance.view", category: "finance", label: "View finance", labelAr: "عرض المالية", labelNl: "Financiën bekijken" },
  { key: "finance.export", category: "finance", label: "Export finance", labelAr: "تصدير المالية", labelNl: "Financiën exporteren" },

  // Audit
  { key: "audit.view", category: "audit", label: "View audit logs", labelAr: "عرض سجلات التدقيق", labelNl: "Auditlogs bekijken" },

  // Security
  { key: "security.view", category: "security", label: "View security", labelAr: "عرض الأمان", labelNl: "Beveiliging bekijken" },
  { key: "security.manage", category: "security", label: "Manage security", labelAr: "إدارة الأمان", labelNl: "Beveiliging beheren" },
  { key: "security.force_logout", category: "security", label: "Force logout / revoke sessions", labelAr: "تسجيل خروج / إلغاء الجلسات", labelNl: "Uitloggen / sessies intrekken" },

  // Fraud
  { key: "fraud.view", category: "fraud", label: "View fraud signals", labelAr: "عرض مؤشرات الاحتيال", labelNl: "Fraudesignalen bekijken" },
  { key: "fraud.manage", category: "fraud", label: "Manage fraud cases", labelAr: "إدارة حالات الاحتيال", labelNl: "Fraudegevallen beheren" },

  // Health
  { key: "health.view", category: "health", label: "View system health", labelAr: "عرض صحة النظام", labelNl: "Systeemstatus bekijken" },

  // CMS
  { key: "cms.view", category: "cms", label: "View CMS", labelAr: "عرض نظام المحتوى", labelNl: "CMS bekijken" },
  { key: "cms.manage", category: "cms", label: "Manage CMS", labelAr: "إدارة نظام المحتوى", labelNl: "CMS beheren" },

  // Announcements
  { key: "announcements.manage", category: "announcements", label: "Manage announcements", labelAr: "إدارة الإعلانات", labelNl: "Aankondigingen beheren" },

  // Email
  { key: "email.view", category: "email", label: "View email templates", labelAr: "عرض قوالب البريد", labelNl: "E-mailsjablonen bekijken" },
  { key: "email.manage", category: "email", label: "Manage email templates", labelAr: "إدارة قوالب البريد", labelNl: "E-mailsjablonen beheren" },

  // Notifications
  { key: "notifications.manage", category: "notifications", label: "Manage broadcasts", labelAr: "إدارة الرسائل الجماعية", labelNl: "Uitzendingen beheren" },

  // API
  { key: "api.view", category: "api", label: "View API management", labelAr: "عرض إدارة API", labelNl: "API-beheer bekijken" },
  { key: "api.manage", category: "api", label: "Manage API keys", labelAr: "إدارة مفاتيح API", labelNl: "API-sleutels beheren" },

  // Backups
  { key: "backups.manage", category: "backups", label: "Manage backups", labelAr: "إدارة النسخ الاحتياطية", labelNl: "Back-ups beheren" },

  // Files
  { key: "files.view", category: "files", label: "View file management", labelAr: "عرض إدارة الملفات", labelNl: "Bestandsbeheer bekijken" },

  // i18n
  { key: "i18n.manage", category: "i18n", label: "Manage translations", labelAr: "إدارة الترجمات", labelNl: "Vertalingen beheren" },

  // Feature flags
  { key: "flags.manage", category: "flags", label: "Manage feature flags", labelAr: "إدارة ميزات النظام", labelNl: "Feature flags beheren" },

  // Performance
  { key: "performance.view", category: "performance", label: "View performance", labelAr: "عرض الأداء", labelNl: "Prestaties bekijken" },

  // RBAC
  { key: "rbac.view", category: "rbac", label: "View roles & permissions", labelAr: "عرض الأدوار والصلاحيات", labelNl: "Rollen en rechten bekijken" },
  { key: "rbac.manage", category: "rbac", label: "Manage roles & permissions", labelAr: "إدارة الأدوار والصلاحيات", labelNl: "Rollen en rechten beheren" },
];

export type AdminRoleDef = {
  key: string;
  name: string;
  nameAr: string;
  nameNl: string;
  description?: string;
  permissions: string[];
};

export const ALL_ADMIN_PERMISSION_KEYS = ADMIN_PERMISSIONS.map((p) => p.key);

export const DEFAULT_ADMIN_ROLES: AdminRoleDef[] = [
  {
    key: "super_admin",
    name: "Super Admin",
    nameAr: "مدير النظام",
    nameNl: "Super Admin",
    description: "Unrestricted access to every area of the platform.",
    permissions: [...ALL_ADMIN_PERMISSION_KEYS],
  },
  {
    key: "platform_admin",
    name: "Platform Admin",
    nameAr: "مدير المنصة",
    nameNl: "Platform Admin",
    description: "Full operational management of the platform.",
    permissions: [
      ...ALL_ADMIN_PERMISSION_KEYS.filter(
        (k) =>
          !k.startsWith("rbac.") &&
          !k.startsWith("security.force_logout") &&
          !k.startsWith("backups."),
      ),
    ],
  },
  {
    key: "finance_admin",
    name: "Finance Admin",
    nameAr: "مدير المالية",
    nameNl: "Finance Admin",
    description: "Finance, wallet, escrow, payment and dispute management.",
    permissions: [
      "dashboard.view",
      "analytics.view",
      "finance.view",
      "finance.export",
      "audit.view",
      "wallets.view",
      "wallets.freeze",
      "wallets.unfreeze",
      "wallets.export",
      "payments.view",
      "payments.investigate",
      "escrow.view",
      "escrow.release",
      "escrow.refund",
      "escrow.freeze",
      "escrow.investigate",
      "orders.view",
      "orders.refund",
      "orders.force_release",
      "orders.force_refund",
      "disputes.view",
      "disputes.manage",
      "disputes.resolve",
      "disputes.chat",
      "users.view",
    ],
  },
  {
    key: "verification_admin",
    name: "Verification Admin",
    nameAr: "مدير التوثيق",
    nameNl: "Verificatie Admin",
    description: "Manages identity verification queue.",
    permissions: [
      "dashboard.view",
      "users.view",
      "users.verify",
      "verification.view",
      "verification.approve",
      "verification.reject",
      "verification.request_info",
      "audit.view",
    ],
  },
  {
    key: "marketplace_admin",
    name: "Marketplace Admin",
    nameAr: "مدير السوق",
    nameNl: "Marktplaats Admin",
    description: "Manages products, services, requests, deals and orders.",
    permissions: [
      "dashboard.view",
      "marketplace.view",
      "marketplace.approve",
      "marketplace.reject",
      "marketplace.hide",
      "marketplace.restore",
      "marketplace.delete",
      "marketplace.feature",
      "marketplace.pin",
      "orders.view",
      "orders.cancel",
      "orders.complete",
      "escrow.view",
      "escrow.investigate",
      "moderation.view",
      "users.view",
    ],
  },
  {
    key: "community_admin",
    name: "Community Admin",
    nameAr: "مدير المجتمع",
    nameNl: "Gemeenschaps Admin",
    description: "Manages city groups, members and community content.",
    permissions: [
      "dashboard.view",
      "communities.view",
      "communities.manage",
      "communities.transfer_ownership",
      "communities.remove_members",
      "communities.lock",
      "communities.archive",
      "moderation.view",
      "moderation.manage",
      "moderation.lock_comments",
      "reports.view",
      "reports.resolve",
      "reports.remove_content",
      "users.view",
      "users.suspend",
    ],
  },
  {
    key: "support_admin",
    name: "Support Admin",
    nameAr: "مدير الدعم",
    nameNl: "Support Admin",
    description: "Runs the customer support center.",
    permissions: [
      "dashboard.view",
      "support.view",
      "support.manage",
      "support.assign",
      "support.escalate",
      "support.merge",
      "disputes.view",
      "disputes.chat",
      "reports.view",
      "reports.resolve",
      "users.view",
      "users.edit",
      "audit.view",
    ],
  },
  {
    key: "moderator",
    name: "Moderator",
    nameAr: "مشرف",
    nameNl: "Moderator",
    description: "Reviews reports and moderates platform content.",
    permissions: [
      "dashboard.view",
      "reports.view",
      "reports.resolve",
      "reports.warn",
      "reports.remove_content",
      "moderation.view",
      "moderation.manage",
      "moderation.lock_comments",
      "communities.view",
      "users.view",
      "users.suspend",
    ],
  },
  {
    key: "content_manager",
    name: "Content Manager",
    nameAr: "مدير المحتوى",
    nameNl: "Content Manager",
    description: "Manages CMS, announcements and moderation.",
    permissions: [
      "dashboard.view",
      "cms.view",
      "cms.manage",
      "announcements.manage",
      "moderation.view",
      "moderation.manage",
      "email.view",
      "notifications.manage",
    ],
  },
  {
    key: "analytics_viewer",
    name: "Analytics Viewer",
    nameAr: "مشاهد التحليلات",
    nameNl: "Analytics Viewer",
    description: "Read-only access to analytics and reports.",
    permissions: [
      "dashboard.view",
      "analytics.view",
      "finance.view",
      "audit.view",
      "health.view",
      "performance.view",
    ],
  },
];
