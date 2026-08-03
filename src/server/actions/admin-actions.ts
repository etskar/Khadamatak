"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

import {
  ADMIN_SESSION_COOKIE,
  requireAdminPermission,
  type AdminContext,
} from "@/server/admin/rbac";
import {
  getAdminSessionContext,
  getRequestInfo,
} from "@/server/admin/guard";
import * as adminAuth from "@/server/admin/auth";
import * as adminUsers from "@/server/admin/users";
import * as adminMarketplace from "@/server/admin/marketplace";
import * as adminReports from "@/server/admin/reports";
import * as adminModeration from "@/server/admin/moderation";
import * as adminCommunities from "@/server/admin/communities";
import * as adminSupport from "@/server/admin/support";
import * as adminSettings from "@/server/admin/settings";
import * as adminCms from "@/server/admin/cms";
import * as adminAnnouncements from "@/server/admin/announcements";
import * as adminEmails from "@/server/admin/emails";
import * as adminBroadcast from "@/server/admin/broadcast";
import * as adminApiKeys from "@/server/admin/api-keys";
import * as adminBackups from "@/server/admin/backups";
import * as adminSecurity from "@/server/admin/security";
import * as adminNotifications from "@/server/admin/notifications";
import * as adminI18n from "@/server/admin/i18n";
import * as adminEnterprise from "@/server/admin/enterprise";
import * as adminRbac from "@/server/admin/rbac";
import * as adminFlags from "@/server/admin/flags";

export type AdminActionResult<T = unknown> = {
  ok: boolean;
  error?: string;
  data?: T;
};

function isRedirectError(e: unknown): boolean {
  const digest = (e as { digest?: string })?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

async function withPermission<T>(
  permission: string,
  fn: (ctx: AdminContext) => Promise<T>,
): Promise<AdminActionResult<T>> {
  try {
    const ctx = await getAdminSessionContext();
    requireAdminPermission(ctx, permission);
    const data = await fn(ctx);
    revalidatePath("/admin", "layout");
    return { ok: true, data };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const error = e instanceof Error ? e.message : "ACTION_FAILED";
    if (error === "ADMIN_AUTH_REQUIRED") {
      const locale = await getLocale();
      redirect({ href: "/admin/login", locale });
    }
    return { ok: false, error };
  }
}

// ─── Auth ─────────────────────────────────────────────────────

export async function adminLoginAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const req = await getRequestInfo();
    const result = await adminAuth.adminLogin({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      req,
    });
    if (!result.ok) return { ok: false, error: result.error };

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    if (result.totpRequired) return { ok: true, data: { step: "2fa" } };
    return { ok: true, data: { step: "done" } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "LOGIN_FAILED" };
  }
}

export async function adminVerify2faAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return { ok: false, error: "SESSION_MISSING" };

    const req = await getRequestInfo();
    await adminAuth.verifyAdminTwoFactor({
      sessionToken: token,
      code: String(formData.get("code") ?? ""),
      req,
      rememberDevice: formData.get("rememberDevice") === "on",
    });
    return { ok: true, data: { step: "done" } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "VERIFY_FAILED" };
  }
}

export async function adminResendOtpAction(
  _prev: AdminActionResult | null,
  _formData: FormData,
): Promise<AdminActionResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return { ok: false, error: "SESSION_MISSING" };
    const req = await getRequestInfo();
    const result = await adminAuth.resendLoginOtp(token, req);
    return { ok: true, data: { devCode: result.devCode } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "RESEND_FAILED" };
  }
}

export async function adminLogoutAction(): Promise<AdminActionResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) await adminAuth.adminLogout(token);
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  const locale = await getLocale();
  redirect({ href: "/admin/login", locale });
  return { ok: true };
}

// ─── Users ────────────────────────────────────────────────────

export async function setUserAccountStatusAction(input: {
  userId: string;
  action: "suspend" | "ban" | "restore" | "deactivate";
  reason?: string;
}) {
  return withPermission("users.suspend", async (ctx) => {
    if (input.action === "ban") requireAdminPermission(ctx, "users.ban");
    if (input.action === "restore") requireAdminPermission(ctx, "users.restore");
    if (input.action === "deactivate") requireAdminPermission(ctx, "users.edit");
    return adminUsers.setUserAccountStatus({ adminId: ctx.admin.id, ...input });
  });
}

export async function resetUserPasswordAction(input: { userId: string }) {
  return withPermission("users.reset_password", async (ctx) =>
    adminUsers.resetUserPassword(ctx.admin.id, input.userId),
  );
}

export async function adminApproveVerificationAction(input: { userId: string }) {
  return withPermission("verification.approve", async (ctx) =>
    adminUsers.adminApproveVerification(ctx.admin.id, input.userId),
  );
}

export async function adminRejectVerificationAction(input: { userId: string; reason?: string }) {
  return withPermission("verification.reject", async (ctx) =>
    adminUsers.adminRejectVerification(ctx.admin.id, input.userId, input.reason ?? "Rejected by admin"),
  );
}

export async function editUserAccountAction(input: {
  userId: string;
  data: { realName?: string; locale?: string; phone?: string };
}) {
  return withPermission("users.edit", async (ctx) =>
    adminUsers.editUserAccount(ctx.admin.id, input.userId, input.data),
  );
}

export async function deleteUserAccountAction(input: { userId: string }) {
  return withPermission("users.delete", async (ctx) =>
    adminUsers.deleteUserAccount(ctx.admin.id, input.userId),
  );
}

export async function editUserAccountFlatAction(input: {
  userId: string;
  realName?: string;
  locale?: string;
  phone?: string;
}) {
  return withPermission("users.edit", async (ctx) =>
    adminUsers.editUserAccount(ctx.admin.id, input.userId, {
      realName: input.realName,
      locale: input.locale,
      phone: input.phone,
    }),
  );
}

// ─── Marketplace ──────────────────────────────────────────────

export async function setListingStatusAction(input: {
  kind: "product" | "service" | "job";
  publicId: string;
  action: "hide" | "restore" | "delete" | "approve";
}) {
  return withPermission("marketplace.manage", async (ctx) =>
    adminMarketplace.setListingStatus({ adminId: ctx.admin.id, ...input }),
  );
}

export async function toggleListingFlagAction(input: {
  kind: "product" | "service" | "job";
  publicId: string;
  flag: "featured" | "pinned";
}) {
  return withPermission("marketplace.feature", async (ctx) =>
    adminMarketplace.toggleListingFlag({ adminId: ctx.admin.id, ...input }),
  );
}

// ─── Reports ──────────────────────────────────────────────────

export async function resolveReportAction(input: {
  reportId: string;
  action: "ignore" | "remove_content" | "warn" | "suspend_user" | "ban_user";
  note?: string;
}) {
  return withPermission("reports.resolve", async (ctx) =>
    adminReports.resolveReport({ adminId: ctx.admin.id, ...input }),
  );
}

// ─── Moderation ───────────────────────────────────────────────

export async function moderateContentAction(input: {
  kind: "post" | "comment" | "group_post";
  id: string;
  action: "hide" | "restore" | "delete";
  note?: string;
}) {
  return withPermission("moderation.manage", async (ctx) =>
    adminModeration.moderateContent({ adminId: ctx.admin.id, ...input }),
  );
}

export async function togglePostCommentsLockAction(input: { postId: string }) {
  return withPermission("moderation.lock_comments", async (ctx) =>
    adminModeration.togglePostCommentsLock({ adminId: ctx.admin.id, ...input }),
  );
}

// ─── Communities ──────────────────────────────────────────────

export async function setGroupStatusAction(input: {
  groupId: string;
  action: "lock" | "archive" | "restore" | "delete";
}) {
  return withPermission("communities.manage", async (ctx) =>
    adminCommunities.setGroupStatus({ adminId: ctx.admin.id, ...input }),
  );
}

export async function transferGroupOwnershipAction(input: {
  groupId: string;
  newOwnerUserId: string;
}) {
  return withPermission("communities.transfer_ownership", async (ctx) =>
    adminCommunities.transferGroupOwnership({ adminId: ctx.admin.id, groupId: input.groupId, newOwnerUserId: input.newOwnerUserId }),
  );
}

export async function removeGroupMemberAction(input: { groupId: string; userId: string }) {
  return withPermission("communities.remove_members", async (ctx) =>
    adminCommunities.removeGroupMember({ adminId: ctx.admin.id, ...input }),
  );
}

// ─── Support ──────────────────────────────────────────────────

export async function replyToTicketAction(input: {
  ticketPublicId: string;
  content: string;
}) {
  return withPermission("support.manage", async (ctx) =>
    adminSupport.replyToTicket({ adminId: ctx.admin.id, ...input }),
  );
}

export async function assignTicketAction(input: { ticketPublicId: string; assigneeId?: string }) {
  return withPermission("support.assign", async (ctx) =>
    adminSupport.assignTicket({ adminId: ctx.admin.id, ...input }),
  );
}

export async function escalateTicketAction(input: { ticketPublicId: string; note?: string }) {
  return withPermission("support.escalate", async (ctx) =>
    adminSupport.escalateTicket({ adminId: ctx.admin.id, ...input }),
  );
}

export async function mergeTicketsAction(input: {
  targetPublicId: string;
  intoPublicId: string;
}) {
  return withPermission("support.merge", async (ctx) =>
    adminSupport.mergeTickets({ adminId: ctx.admin.id, ...input }),
  );
}

export async function setTicketStatusAction(input: {
  ticketPublicId: string;
  status: "open" | "in_progress" | "pending" | "closed";
}) {
  return withPermission("support.manage", async (ctx) =>
    adminSupport.setTicketStatus({ adminId: ctx.admin.id, ...input }),
  );
}

// ─── Settings & Flags ─────────────────────────────────────────

export async function updatePlatformSettingsAction(input: {
  data: {
    feePercentBps?: number;
    feeFixedCents?: number;
    minFeeCents?: number;
    currency?: string;
    timezone?: string;
    defaultLanguage?: string;
    theme?: string;
    maintenanceMode?: boolean;
    maintenanceMessage?: { ar?: string; nl?: string };
    emailFromAddress?: string;
    marketplaceRulesJson?: string;
    verificationRulesJson?: string;
  };
}) {
  return withPermission("settings.manage", async (ctx) =>
    adminSettings.updatePlatformSettings({ adminId: ctx.admin.id, data: input.data }),
  );
}

export async function updatePlatformSettingsFlatAction(input: {
  feePercentBps?: number;
  feeFixedCents?: number;
  minFeeCents?: number;
  currency?: string;
  timezone?: string;
  defaultLanguage?: string;
  theme?: string;
  maintenanceMode?: boolean;
  emailFromAddress?: string;
}) {
  return withPermission("settings.manage", async (ctx) =>
    adminSettings.updatePlatformSettings({
      adminId: ctx.admin.id,
      data: {
        feePercentBps: input.feePercentBps,
        feeFixedCents: input.feeFixedCents,
        minFeeCents: input.minFeeCents,
        currency: input.currency,
        timezone: input.timezone,
        defaultLanguage: input.defaultLanguage,
        theme: input.theme,
        maintenanceMode: input.maintenanceMode,
        emailFromAddress: input.emailFromAddress,
      },
    }),
  );
}

export async function upsertSystemSettingAction(input: {
  key: string;
  value: unknown;
  category?: string;
  description?: string;
  isSecret?: boolean;
}) {
  return withPermission("settings.manage", async (ctx) =>
    adminSettings.upsertSystemSetting({ adminId: ctx.admin.id, ...input }),
  );
}

export async function updateFeatureFlagAction(input: { key: string; enabled: boolean }) {
  return withPermission("flags.manage", async (ctx) =>
    adminSettings.updateFeatureFlag({ adminId: ctx.admin.id, ...input }),
  );
}

export async function createFeatureFlagAction(input: {
  key: string;
  label?: string;
  description?: string;
  enabled?: boolean;
}) {
  return withPermission("flags.manage", async (ctx) =>
    adminFlags.createFeatureFlag({ adminId: ctx.admin.id, ...input }),
  );
}

export async function setFeatureFlagAction(input: { key: string; enabled: boolean }) {
  return withPermission("flags.manage", async (ctx) =>
    adminFlags.setFeatureFlag({ adminId: ctx.admin.id, ...input }),
  );
}

export async function deleteFeatureFlagAction(input: { key: string }) {
  return withPermission("flags.manage", async (ctx) =>
    adminFlags.deleteFeatureFlag(ctx.admin.id, input.key),
  );
}

// ─── CMS ──────────────────────────────────────────────────────

export async function upsertCmsPageAction(input: {
  id?: string;
  slug: string;
  title: { ar: string; nl: string };
  content?: unknown;
  status?: string;
}) {
  return withPermission("cms.manage", async (ctx) =>
    adminCms.upsertCmsPage({ adminId: ctx.admin.id, ...input }),
  );
}

export async function setCmsPageStatusAction(input: { id: string; status: string }) {
  return withPermission("cms.manage", async (ctx) =>
    adminCms.setCmsPageStatus(ctx.admin.id, input.id, input.status),
  );
}

export async function upsertCmsPageFlatAction(input: {
  id?: string;
  slug: string;
  titleAr?: string;
  titleNl?: string;
  content?: string;
  status?: string;
}) {
  return withPermission("cms.manage", async (ctx) =>
    adminCms.upsertCmsPage({
      adminId: ctx.admin.id,
      id: input.id,
      slug: input.slug,
      title: {
        ar: input.titleAr ?? input.slug,
        nl: input.titleNl ?? input.slug,
      },
      content: input.content,
      status: input.status,
    }),
  );
}

export async function deleteCmsPageAction(input: { id: string }) {
  return withPermission("cms.manage", async (ctx) =>
    adminCms.deleteCmsPage(ctx.admin.id, input.id),
  );
}

export async function upsertCmsSectionAction(input: {
  key: string;
  heading?: { ar: string; nl: string };
  subheading?: { ar: string; nl: string };
  ctaLabel?: { ar: string; nl: string };
  ctaHref?: string;
  imageUrl?: string;
  enabled?: boolean;
  sortOrder?: number;
}) {
  return withPermission("cms.manage", async (ctx) =>
    adminCms.upsertCmsSection({ adminId: ctx.admin.id, ...input }),
  );
}

export async function deleteCmsSectionAction(input: { key: string }) {
  return withPermission("cms.manage", async (ctx) =>
    adminCms.deleteCmsSection(ctx.admin.id, input.key),
  );
}

export async function upsertCmsBannerAction(input: {
  id?: string;
  placement: string;
  title: { ar: string; nl: string };
  subtitle?: { ar: string; nl: string };
  imageUrl?: string;
  linkUrl?: string;
  audience?: string;
  active?: boolean;
  sortOrder?: number;
}) {
  return withPermission("cms.manage", async (ctx) =>
    adminCms.upsertCmsBanner({ adminId: ctx.admin.id, ...input }),
  );
}

export async function deleteCmsBannerAction(input: { id: string }) {
  return withPermission("cms.manage", async (ctx) =>
    adminCms.deleteCmsBanner(ctx.admin.id, input.id),
  );
}

export async function upsertCmsMenuItemAction(input: {
  id?: string;
  placement: string;
  label: { ar: string; nl: string };
  href: string;
  sortOrder?: number;
  parentId?: string;
}) {
  return withPermission("cms.manage", async (ctx) =>
    adminCms.upsertCmsMenuItem({ adminId: ctx.admin.id, ...input }),
  );
}

export async function deleteCmsMenuItemAction(input: { id: string }) {
  return withPermission("cms.manage", async (ctx) =>
    adminCms.deleteCmsMenuItem(ctx.admin.id, input.id),
  );
}

// ─── Announcements ────────────────────────────────────────────

export async function createAnnouncementAction(input: {
  type: string;
  title: { ar: string; nl: string };
  body: { ar: string; nl: string };
  audience: string;
  scheduledAt?: string;
}) {
  return withPermission("announcements.manage", async (ctx) =>
    adminAnnouncements.createAnnouncement({ adminId: ctx.admin.id, ...input }),
  );
}

export async function createAnnouncementFlatAction(input: {
  type?: string;
  titleAr?: string;
  titleNl?: string;
  bodyAr?: string;
  bodyNl?: string;
  audience?: string;
  scheduledAt?: string;
}) {
  return withPermission("announcements.manage", async (ctx) =>
    adminAnnouncements.createAnnouncement({
      adminId: ctx.admin.id,
      type: input.type ?? "info",
      title: {
        ar: input.titleAr ?? input.titleNl ?? "",
        nl: input.titleNl ?? input.titleAr ?? "",
      },
      body: {
        ar: input.bodyAr ?? input.bodyNl ?? "",
        nl: input.bodyNl ?? input.bodyAr ?? "",
      },
      audience: input.audience ?? "all",
      scheduledAt: input.scheduledAt,
    }),
  );
}

export async function updateAnnouncementAction(input: {
  id: string;
  title?: { ar: string; nl: string };
  body?: { ar: string; nl: string };
  audience?: string;
  status?: string;
  scheduledAt?: string | null;
}) {
  return withPermission("announcements.manage", async (ctx) =>
    adminAnnouncements.updateAnnouncement({ adminId: ctx.admin.id, ...input }),
  );
}

export async function publishAnnouncementAction(input: { id: string }) {
  return withPermission("announcements.manage", async (ctx) =>
    adminAnnouncements.publishAnnouncement(ctx.admin.id, input.id),
  );
}

export async function deleteAnnouncementAction(input: { id: string }) {
  return withPermission("announcements.manage", async (ctx) =>
    adminAnnouncements.deleteAnnouncement(ctx.admin.id, input.id),
  );
}

// ─── Email templates ──────────────────────────────────────────

export async function upsertEmailTemplateAction(input: {
  key: string;
  name: string;
  subject: { ar: string; nl: string };
  body: { ar: string; nl: string };
  fromEmail?: string;
  enabled?: boolean;
  variables?: string[];
}) {
  return withPermission("email.manage", async (ctx) =>
    adminEmails.upsertEmailTemplate({ adminId: ctx.admin.id, ...input }),
  );
}

export async function upsertEmailTemplateFlatAction(input: {
  key: string;
  name: string;
  subjectAr?: string;
  subjectNl?: string;
  bodyAr?: string;
  bodyNl?: string;
  enabled?: boolean;
}) {
  return withPermission("email.manage", async (ctx) =>
    adminEmails.upsertEmailTemplate({
      adminId: ctx.admin.id,
      key: input.key,
      name: input.name,
      subject: {
        ar: input.subjectAr ?? input.subjectNl ?? input.key,
        nl: input.subjectNl ?? input.subjectAr ?? input.key,
      },
      body: {
        ar: input.bodyAr ?? input.bodyNl ?? "",
        nl: input.bodyNl ?? input.bodyAr ?? "",
      },
      enabled: input.enabled,
    }),
  );
}

export async function testSendEmailAction(input: {
  templateId: string;
  toEmail: string;
  vars?: Record<string, string>;
}) {
  return withPermission("email.manage", async (ctx) =>
    adminEmails.testSendEmail({ adminId: ctx.admin.id, ...input }),
  );
}

// ─── Broadcasts ───────────────────────────────────────────────

export async function createBroadcastAction(input: {
  type: string;
  audience: string;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  scheduledAt?: string;
}) {
  return withPermission("notifications.manage", async (ctx) =>
    adminBroadcast.createBroadcast({ adminId: ctx.admin.id, ...input }),
  );
}

export async function sendBroadcastAction(input: { id: string }) {
  return withPermission("notifications.manage", async (ctx) =>
    adminBroadcast.sendBroadcast(ctx.admin.id, input.id),
  );
}

export async function cancelBroadcastAction(input: { id: string }) {
  return withPermission("notifications.manage", async (ctx) =>
    adminBroadcast.cancelBroadcast(ctx.admin.id, input.id),
  );
}

export async function deleteBroadcastAction(input: { id: string }) {
  return withPermission("notifications.manage", async (ctx) =>
    adminBroadcast.deleteBroadcast(ctx.admin.id, input.id),
  );
}

// ─── API keys ─────────────────────────────────────────────────

export async function createApiKeyAction(input: {
  name: string;
  scopes: string[];
  expiresAt?: string;
  rateLimitPerMinute?: number;
}) {
  return withPermission("api.manage", async (ctx) =>
    adminApiKeys.createApiKey({ adminId: ctx.admin.id, ...input }),
  );
}

export async function createApiKeyFlatAction(input: {
  name: string;
  scopes?: string;
  expiresAt?: string;
}) {
  return withPermission("api.manage", async (ctx) =>
    adminApiKeys.createApiKey({
      adminId: ctx.admin.id,
      name: input.name,
      scopes: input.scopes
        ? input.scopes.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      expiresAt: input.expiresAt,
    }),
  );
}

export async function rotateApiKeyAction(input: { id: string }) {
  return withPermission("api.manage", async (ctx) =>
    adminApiKeys.rotateApiKey(ctx.admin.id, input.id),
  );
}

export async function setApiKeyStatusAction(input: {
  id: string;
  status: "active" | "revoked";
}) {
  return withPermission("api.manage", async (ctx) =>
    adminApiKeys.setApiKeyStatus(ctx.admin.id, input.id, input.status),
  );
}

export async function deleteApiKeyAction(input: { id: string }) {
  return withPermission("api.manage", async (ctx) =>
    adminApiKeys.deleteApiKey(ctx.admin.id, input.id),
  );
}

// ─── Backups ──────────────────────────────────────────────────

export async function requestBackupNowAction() {
  return withPermission("backups.manage", async (ctx) =>
    adminBackups.requestBackupNow(ctx.admin.id),
  );
}

export async function deleteBackupAction(input: { id: string }) {
  return withPermission("backups.manage", async (ctx) =>
    adminBackups.deleteBackup(ctx.admin.id, input.id),
  );
}

// ─── Security & Fraud ─────────────────────────────────────────

export async function acknowledgeSecurityEventAction(input: { id: string }) {
  return withPermission("security.manage", async (ctx) =>
    adminSecurity.acknowledgeSecurityEvent(ctx.admin.id, input.id),
  );
}

export async function setUserRiskScoreAction(input: {
  userId: string;
  score: number;
  factors?: { label: string; points: number }[];
  reason?: string;
}) {
  return withPermission("fraud.manage", async (ctx) =>
    adminSecurity.setUserRiskScore({ adminId: ctx.admin.id, ...input }),
  );
}

// ─── Notifications cleanup ────────────────────────────────────

export async function clearOldNotificationsAction(input: { olderThanDays: number }) {
  return withPermission("notifications.manage", async (ctx) =>
    adminNotifications.clearOldNotifications(ctx.admin.id, input.olderThanDays),
  );
}

// ─── i18n ─────────────────────────────────────────────────────

export async function updateTranslationKeyAction(input: {
  locale: string;
  key: string;
  value: string;
}) {
  return withPermission("i18n.manage", async (ctx) =>
    adminI18n.updateTranslationKey({ adminId: ctx.admin.id, ...input }),
  );
}

export async function translateMissingKeysAction() {
  return withPermission("i18n.manage", async (ctx) =>
    adminI18n.translateMissingKeys(ctx.admin.id),
  );
}

export async function deleteTranslationKeyAction(input: { locale: string; key: string }) {
  return withPermission("i18n.manage", async (ctx) =>
    adminI18n.deleteTranslationKey({ adminId: ctx.admin.id, ...input }),
  );
}

// ─── Enterprise ───────────────────────────────────────────────

export async function verifyBusinessAccountAction(input: { id: string }) {
  return withPermission("users.verify", async (ctx) =>
    adminEnterprise.verifyBusinessAccount(ctx.admin.id, input.id),
  );
}

export async function rejectBusinessAccountAction(input: { id: string }) {
  return withPermission("users.verify", async (ctx) =>
    adminEnterprise.rejectBusinessAccount(ctx.admin.id, input.id),
  );
}

// ─── RBAC ─────────────────────────────────────────────────────

export async function createRoleAction(input: {
  key: string;
  name: string;
  nameAr?: string;
  nameNl?: string;
  description?: string;
  permissionKeys: string[];
}) {
  return withPermission("rbac.manage", async () =>
    adminRbac.createRole({
      key: input.key,
      name: input.name,
      nameAr: input.nameAr,
      nameNl: input.nameNl,
      description: input.description,
      permissionKeys: input.permissionKeys,
    }),
  );
}

export async function updateRoleAction(input: {
  id: string;
  name?: string;
  nameAr?: string;
  nameNl?: string;
  description?: string;
  permissionKeys?: string[];
}) {
  return withPermission("rbac.manage", async () =>
    adminRbac.updateRole({
      id: input.id,
      name: input.name,
      nameAr: input.nameAr,
      nameNl: input.nameNl,
      description: input.description,
      permissionKeys: input.permissionKeys,
    }),
  );
}

export async function deleteRoleAction(input: { id: string }) {
  return withPermission("rbac.manage", async () => adminRbac.deleteRole(input.id));
}

export async function createAdminUserAction(input: {
  email: string;
  password: string;
  name: string;
  roleId: string;
}) {
  return withPermission("rbac.manage", async () =>
    adminRbac.createAdminUser({
      email: input.email,
      password: input.password,
      name: input.name,
      roleId: input.roleId,
    }),
  );
}

export async function updateAdminUserAction(input: {
  id: string;
  name?: string;
  roleId?: string;
  status?: string;
  twoFactorEnabled?: boolean;
}) {
  return withPermission("rbac.manage", async () =>
    adminRbac.updateAdminUser({
      id: input.id,
      name: input.name,
      roleId: input.roleId,
      status: input.status,
      twoFactorEnabled: input.twoFactorEnabled,
    }),
  );
}

export async function resetAdminPasswordAction(input: { id: string; newPassword: string }) {
  return withPermission("rbac.manage", async () =>
    adminRbac.resetAdminPassword(input.id, input.newPassword),
  );
}

export async function deleteAdminUserAction(input: { id: string }) {
  return withPermission("rbac.manage", async () => adminRbac.deleteAdminUser(input.id));
}

// ─── Exports ──────────────────────────────────────────────────

export async function exportUsersCsvAction(): Promise<AdminActionResult<{ csv: string }>> {
  return withPermission("users.export", async () => ({
    csv: adminUsers.toCsv(await adminUsers.exportUsers()),
  }));
}
