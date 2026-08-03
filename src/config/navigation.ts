import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Briefcase,
  Heart,
  Home,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Package,
  Search,
  Settings,
  Store,
  Users,
  UserRound,
  Building2,
} from "lucide-react";

export type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  showInBottomNav?: boolean;
  showInSidebar?: boolean;
  adminOnly?: boolean;
};

export const mainNavItems: NavItem[] = [
  {
    key: "home",
    href: "/",
    icon: Home,
    showInBottomNav: true,
    showInSidebar: true,
  },
  {
    key: "search",
    href: "/search",
    icon: Search,
    showInBottomNav: true,
    showInSidebar: true,
  },
  {
    key: "products",
    href: "/products",
    icon: Package,
    showInBottomNav: false,
    showInSidebar: true,
  },
  {
    key: "services",
    href: "/services",
    icon: Briefcase,
    showInBottomNav: false,
    showInSidebar: true,
  },
  {
    key: "jobs",
    href: "/jobs",
    icon: Building2,
    showInBottomNav: false,
    showInSidebar: true,
  },
  {
    key: "groups",
    href: "/groups",
    icon: Users,
    showInBottomNav: false,
    showInSidebar: true,
  },
  {
    key: "map",
    href: "/map",
    icon: MapPin,
    showInBottomNav: false,
    showInSidebar: true,
  },
  {
    key: "messages",
    href: "/messages",
    icon: MessageCircle,
    showInBottomNav: true,
    showInSidebar: true,
  },
  {
    key: "notifications",
    href: "/notifications",
    icon: Bell,
    showInBottomNav: true,
    showInSidebar: true,
  },
  {
    key: "sell",
    href: "/sell",
    icon: Store,
    showInBottomNav: false,
    showInSidebar: true,
  },
  {
    key: "favorites",
    href: "/favorites",
    icon: Heart,
    showInBottomNav: false,
    showInSidebar: true,
  },
  {
    key: "profile",
    href: "/profile",
    icon: UserRound,
    showInBottomNav: true,
    showInSidebar: true,
  },
  {
    key: "settings",
    href: "/settings",
    icon: Settings,
    showInBottomNav: false,
    showInSidebar: true,
  },
];

export const adminNavItems: NavItem[] = [
  {
    key: "admin",
    href: "/admin",
    icon: LayoutDashboard,
    showInSidebar: true,
    adminOnly: true,
  },
];

export const bottomNavKeys = [
  "home",
  "search",
  "messages",
  "notifications",
  "profile",
] as const;
