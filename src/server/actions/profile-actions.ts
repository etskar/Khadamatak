"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  updateProfile,
  updateUserPreferences,
} from "@/server/users/profile-service";
import {
  changePassword,
  sendPhoneOtp,
  submitVerification,
  verifyPhoneOtp,
} from "@/server/users/verification-service";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { generateSecureToken } from "@/lib/crypto";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user;
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const hobbies = String(formData.get("hobbies") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const languages = String(formData.get("languages") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await updateProfile(user.id, {
    displayName: String(formData.get("displayName") ?? ""),
    bio: String(formData.get("bio") ?? "") || null,
    country: String(formData.get("country") ?? "") || null,
    city: String(formData.get("city") ?? "") || null,
    work: String(formData.get("work") ?? "") || null,
    education: String(formData.get("education") ?? "") || null,
    hobbies,
    languages,
    website: String(formData.get("website") ?? "") || null,
    contactEmail: String(formData.get("contactEmail") ?? "") || null,
    contactPhone: String(formData.get("contactPhone") ?? "") || null,
  });

  revalidatePath("/profile");
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function updatePreferencesAction(formData: FormData) {
  const user = await requireUser();
  const locale = String(formData.get("locale") ?? "");
  const theme = String(formData.get("theme") ?? "");
  const data: Parameters<typeof updateUserPreferences>[1] = {};
  if (locale === "nl" || locale === "ar") data.locale = locale;
  if (theme) data.theme = theme;
  if (formData.has("notificationsOn")) {
    data.notificationsOn = formData.get("notificationsOn") === "on";
  }
  await updateUserPreferences(user.id, data);
  revalidatePath("/settings");
  return { ok: true as const, locale };
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  await changePassword(
    user.id,
    String(formData.get("currentPassword") ?? ""),
    String(formData.get("newPassword") ?? ""),
  );
  return { ok: true as const };
}

export async function sendPhoneOtpAction(formData: FormData) {
  const user = await requireUser();
  const phone = String(formData.get("phone") ?? "");
  const result = await sendPhoneOtp(user.id, phone);
  return { ok: true as const, ...result };
}

export async function verifyPhoneOtpAction(formData: FormData) {
  const user = await requireUser();
  await verifyPhoneOtp(
    user.id,
    String(formData.get("phone") ?? ""),
    String(formData.get("code") ?? ""),
  );
  revalidatePath("/verification");
  return { ok: true as const };
}

export async function submitVerificationAction(formData: FormData) {
  const user = await requireUser();

  let governmentIdUrl = String(formData.get("governmentIdUrl") ?? "");
  const file = formData.get("governmentId");
  if (file && file instanceof File && file.size > 0) {
    governmentIdUrl = await saveUpload(file, "ids");
  }
  if (!governmentIdUrl) throw new Error("ID_REQUIRED");

  let selfieUrl: string | undefined;
  const selfie = formData.get("selfie");
  if (selfie && selfie instanceof File && selfie.size > 0) {
    selfieUrl = await saveUpload(selfie, "selfies");
  }

  await submitVerification({
    userId: user.id,
    fullName: String(formData.get("fullName") ?? ""),
    addressLine1: String(formData.get("addressLine1") ?? ""),
    addressLine2: String(formData.get("addressLine2") ?? "") || undefined,
    city: String(formData.get("city") ?? ""),
    country: String(formData.get("country") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    nationalId: String(formData.get("nationalId") ?? "") || undefined,
    governmentIdUrl,
    selfieUrl,
    termsAccepted: formData.get("termsAccepted") === "on",
  });

  revalidatePath("/verification");
  revalidatePath("/profile");
  return { ok: true as const };
}

export async function uploadAvatarAction(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("FILE_REQUIRED");
  const url = await saveUpload(file, "avatars");
  await updateProfile(user.id, { avatarUrl: url });
  revalidatePath("/profile");
  return { ok: true as const, url };
}

export async function uploadCoverAction(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("FILE_REQUIRED");
  const url = await saveUpload(file, "covers");
  await updateProfile(user.id, { coverUrl: url });
  revalidatePath("/profile");
  return { ok: true as const, url };
}

export async function uploadPostMediaAction(formData: FormData) {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("FILE_REQUIRED");
  const type = file.type.startsWith("video/") ? "video" : "image";
  const url = await saveUpload(file, "posts");
  return { ok: true as const, url, type };
}

async function saveUpload(file: File, folder: string) {
  const max = 8 * 1024 * 1024;
  if (file.size > max) throw new Error("FILE_TOO_LARGE");
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
  };
  const ext = mimeToExt[file.type];
  if (!ext) throw new Error("INVALID_FILE_TYPE");

  const name = `${generateSecureToken(12)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);
  return `/uploads/${folder}/${name}`;
}
