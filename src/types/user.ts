import type { AppLocale } from "@/i18n/routing";

/**
 * Foundation types only — no business logic.
 * Ready for auth, profiles, roles, and verification in later phases.
 */

export const USER_ROLES = ["user", "moderator", "admin", "super_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const ACCOUNT_STATUSES = [
  "active",
  "suspended",
  "deactivated",
  "banned",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export type Permission =
  | "feed:read"
  | "feed:write"
  | "products:read"
  | "products:write"
  | "groups:read"
  | "groups:write"
  | "messages:read"
  | "messages:write"
  | "services:read"
  | "services:write"
  | "jobs:read"
  | "jobs:write"
  | "admin:access"
  | "admin:users"
  | "admin:moderation"
  | "admin:settings";

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  user: [
    "feed:read",
    "feed:write",
    "products:read",
    "products:write",
    "services:read",
    "services:write",
    "jobs:read",
    "jobs:write",
    "groups:read",
    "groups:write",
    "messages:read",
    "messages:write",
  ],
  moderator: [
    "feed:read",
    "feed:write",
    "products:read",
    "products:write",
    "services:read",
    "services:write",
    "jobs:read",
    "jobs:write",
    "groups:read",
    "groups:write",
    "messages:read",
    "messages:write",
    "admin:access",
    "admin:moderation",
  ],
  admin: [
    "feed:read",
    "feed:write",
    "products:read",
    "products:write",
    "services:read",
    "services:write",
    "jobs:read",
    "jobs:write",
    "groups:read",
    "groups:write",
    "messages:read",
    "messages:write",
    "admin:access",
    "admin:users",
    "admin:moderation",
    "admin:settings",
  ],
  super_admin: [
    "feed:read",
    "feed:write",
    "products:read",
    "products:write",
    "services:read",
    "services:write",
    "jobs:read",
    "jobs:write",
    "groups:read",
    "groups:write",
    "messages:read",
    "messages:write",
    "admin:access",
    "admin:users",
    "admin:moderation",
    "admin:settings",
  ],
} as const;

export type UserPreferences = {
  locale: AppLocale;
  theme: "system" | "light" | "dark";
  notificationsEnabled: boolean;
};

export type UserProfile = {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  permissions: readonly Permission[];
  verificationStatus: VerificationStatus;
  accountStatus: AccountStatus;
  preferences: UserPreferences;
  profile: UserProfile | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SessionUser = Pick<
  User,
  | "id"
  | "email"
  | "role"
  | "permissions"
  | "verificationStatus"
  | "accountStatus"
  | "preferences"
> & {
  profile: Pick<
    UserProfile,
    "displayName" | "username" | "avatarUrl"
  > | null;
};

export function hasPermission(
  user: Pick<User, "permissions"> | null | undefined,
  permission: Permission,
): boolean {
  return Boolean(user?.permissions.includes(permission));
}

export function isAdminRole(role: UserRole): boolean {
  return role === "admin" || role === "super_admin" || role === "moderator";
}
