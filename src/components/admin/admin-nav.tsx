import {
  LayoutDashboard,
  Users,
  BadgeCheck,
  Store,
  Flag,
  ShieldCheck,
  Users2,
  Headphones,
  BarChart3,
  ScrollText,
  ShieldAlert,
  Radar,
  HeartPulse,
  FileText,
  Megaphone,
  Mail,
  Bell,
  KeyRound,
  Database,
  FolderOpen,
  Languages,
  ToggleLeft,
  Gauge,
  Settings,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  permission: string;
};

export type AdminNavSection = {
  labelKey: string;
  items: AdminNavItem[];
};

export const adminNavSections: AdminNavSection[] = [
  {
    labelKey: "nav.overview",
    items: [
      { href: "/admin", labelKey: "nav.dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
    ],
  },
  {
    labelKey: "nav.management",
    items: [
      { href: "/admin/users", labelKey: "nav.users", icon: Users, permission: "users.view" },
      { href: "/admin/verification", labelKey: "nav.verification", icon: BadgeCheck, permission: "verification.view" },
      { href: "/admin/marketplace", labelKey: "nav.marketplace", icon: Store, permission: "marketplace.view" },
      { href: "/admin/reports", labelKey: "nav.reports", icon: Flag, permission: "reports.view" },
      { href: "/admin/moderation", labelKey: "nav.moderation", icon: ShieldCheck, permission: "moderation.view" },
      { href: "/admin/communities", labelKey: "nav.communities", icon: Users2, permission: "communities.view" },
      { href: "/admin/support", labelKey: "nav.support", icon: Headphones, permission: "support.view" },
    ],
  },
  {
    labelKey: "nav.business",
    items: [
      { href: "/admin/analytics", labelKey: "nav.analytics", icon: BarChart3, permission: "analytics.view" },
      { href: "/admin/audit", labelKey: "nav.audit", icon: ScrollText, permission: "audit.view" },
      { href: "/admin/security", labelKey: "nav.security", icon: ShieldAlert, permission: "security.view" },
      { href: "/admin/fraud", labelKey: "nav.fraud", icon: Radar, permission: "fraud.view" },
      { href: "/admin/health", labelKey: "nav.health", icon: HeartPulse, permission: "health.view" },
    ],
  },
  {
    labelKey: "nav.platform",
    items: [
      { href: "/admin/cms", labelKey: "nav.cms", icon: FileText, permission: "cms.view" },
      { href: "/admin/announcements", labelKey: "nav.announcements", icon: Megaphone, permission: "announcements.manage" },
      { href: "/admin/emails", labelKey: "nav.emails", icon: Mail, permission: "email.view" },
      { href: "/admin/notifications", labelKey: "nav.notifications", icon: Bell, permission: "notifications.manage" },
      { href: "/admin/api-keys", labelKey: "nav.api", icon: KeyRound, permission: "api.view" },
      { href: "/admin/backups", labelKey: "nav.backups", icon: Database, permission: "backups.manage" },
      { href: "/admin/files", labelKey: "nav.files", icon: FolderOpen, permission: "files.view" },
      { href: "/admin/i18n", labelKey: "nav.i18n", icon: Languages, permission: "i18n.manage" },
      { href: "/admin/flags", labelKey: "nav.flags", icon: ToggleLeft, permission: "flags.manage" },
      { href: "/admin/performance", labelKey: "nav.performance", icon: Gauge, permission: "performance.view" },
    ],
  },
  {
    labelKey: "nav.system",
    items: [
      { href: "/admin/settings", labelKey: "nav.settings", icon: Settings, permission: "settings.view" },
      { href: "/admin/admins", labelKey: "nav.admins", icon: UserCog, permission: "rbac.view" },
    ],
  },
];
