"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { parseAmountToCents } from "@/lib/money";
import { createProduct, updateProductStatus } from "@/server/marketplace/product-service";
import { createService, updateServiceStatus } from "@/server/marketplace/service-service";
import { createJob, updateJobStatus } from "@/server/marketplace/job-service";
import { toggleFavorite } from "@/server/marketplace/favorite-service";
import {
  createGroupPost,
  requestJoinGroup,
} from "@/server/marketplace/group-service";
import { reportTarget } from "@/server/social/post-service";
import { startConversationAction } from "@/server/actions/social-actions";
import { geocodeAddress, reverseGeocode } from "@/server/geo/geocode";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { generateSecureToken } from "@/lib/crypto";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user;
}

async function saveMedia(file: File, folder: string) {
  const max = 10 * 1024 * 1024;
  if (file.size > max) throw new Error("FILE_TOO_LARGE");
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
  };
  const ext = mimeToExt[file.type];
  if (!ext) throw new Error("INVALID_FILE_TYPE");
  const name = `${generateSecureToken(12)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return {
    url: `/uploads/${folder}/${name}`,
    type: (file.type.startsWith("video/") ? "video" : "image") as "image" | "video",
  };
}

export async function createProductAction(formData: FormData) {
  const user = await requireUser();
  const media: { type: "image" | "video"; url: string }[] = [];
  for (const f of formData.getAll("media")) {
    if (f instanceof File && f.size > 0) media.push(await saveMedia(f, "products"));
  }

  const product = await createProduct({
    sellerId: user.id,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    categoryId: String(formData.get("categoryId") ?? "") || null,
    priceCents: parseAmountToCents(String(formData.get("price") ?? "")),
    condition: String(formData.get("condition") ?? "used"),
    city: String(formData.get("city") ?? "") || undefined,
    country: String(formData.get("country") ?? "NL"),
    addressLine: String(formData.get("addressLine") ?? "") || undefined,
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : null,
    groupId: String(formData.get("groupId") ?? "") || null,
    media,
  });

  revalidatePath("/products");
  revalidatePath("/sell");
  return { ok: true as const, publicId: product.publicId };
}

export async function createServiceAction(formData: FormData) {
  const user = await requireUser();
  const media: { type: "image" | "video"; url: string }[] = [];
  for (const f of formData.getAll("media")) {
    if (f instanceof File && f.size > 0) media.push(await saveMedia(f, "services"));
  }

  const priceRaw = String(formData.get("price") ?? "").trim();
  const service = await createService({
    providerId: user.id,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    categoryId: String(formData.get("categoryId") ?? "") || null,
    priceCents: priceRaw ? parseAmountToCents(priceRaw) : null,
    pricingType: String(formData.get("pricingType") ?? "fixed"),
    availability: String(formData.get("availability") ?? "") || undefined,
    workingHours: String(formData.get("workingHours") ?? "") || undefined,
    city: String(formData.get("city") ?? "") || undefined,
    country: String(formData.get("country") ?? "NL"),
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : null,
    groupId: String(formData.get("groupId") ?? "") || null,
    media,
  });

  revalidatePath("/services");
  revalidatePath("/sell");
  return { ok: true as const, publicId: service.publicId };
}

export async function createJobAction(formData: FormData) {
  const user = await requireUser();
  const media: { type: "image" | "video"; url: string }[] = [];
  for (const f of formData.getAll("media")) {
    if (f instanceof File && f.size > 0) media.push(await saveMedia(f, "jobs"));
  }

  const salaryMinRaw = String(formData.get("salaryMin") ?? "").trim();
  const salaryMaxRaw = String(formData.get("salaryMax") ?? "").trim();

  const job = await createJob({
    employerId: user.id,
    title: String(formData.get("title") ?? ""),
    company: String(formData.get("company") ?? ""),
    description: String(formData.get("description") ?? ""),
    requirements: String(formData.get("requirements") ?? "") || undefined,
    categoryId: String(formData.get("categoryId") ?? "") || null,
    salaryMinCents: salaryMinRaw ? parseAmountToCents(salaryMinRaw) : null,
    salaryMaxCents: salaryMaxRaw ? parseAmountToCents(salaryMaxRaw) : null,
    salaryPeriod: String(formData.get("salaryPeriod") ?? "monthly"),
    employmentType: String(formData.get("employmentType") ?? "full_time"),
    workHours: String(formData.get("workHours") ?? "") || undefined,
    applyMethod: String(formData.get("applyMethod") ?? "message"),
    applyUrl: String(formData.get("applyUrl") ?? "") || undefined,
    applyEmail: String(formData.get("applyEmail") ?? "") || undefined,
    city: String(formData.get("city") ?? "") || undefined,
    country: String(formData.get("country") ?? "NL"),
    addressLine: String(formData.get("addressLine") ?? "") || undefined,
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : null,
    groupId: String(formData.get("groupId") ?? "") || null,
    media,
  });

  revalidatePath("/jobs");
  revalidatePath("/sell");
  return { ok: true as const, publicId: job.publicId };
}

export async function geocodeAddressAction(query: string, countryCodes?: string[]) {
  return geocodeAddress(query, countryCodes);
}

export async function reverseGeocodeAction(latitude: number, longitude: number) {
  return reverseGeocode(latitude, longitude);
}

export async function toggleFavoriteAction(
  targetType: "product" | "service" | "post" | "group" | "seller",
  targetId: string,
) {
  const user = await requireUser();
  const res = await toggleFavorite({ userId: user.id, targetType, targetId });
  revalidatePath("/favorites");
  return res;
}

export async function joinGroupAction(slug: string) {
  const user = await requireUser();
  await requestJoinGroup(user.id, slug);
  revalidatePath(`/groups/${slug}`);
  return { ok: true as const };
}

export async function createGroupPostAction(formData: FormData) {
  const user = await requireUser();
  await createGroupPost({
    userId: user.id,
    slug: String(formData.get("slug") ?? ""),
    content: String(formData.get("content") ?? ""),
  });
  revalidatePath(`/groups/${String(formData.get("slug") ?? "")}`);
  return { ok: true as const };
}

export async function setListingStatusAction(
  kind: "product" | "service" | "job",
  publicId: string,
  status: "active" | "paused" | "deleted" | "draft" | "filled",
) {
  const user = await requireUser();
  if (kind === "product")
    await updateProductStatus(
      user.id,
      publicId,
      status as "active" | "paused" | "deleted" | "draft",
    );
  else if (kind === "service")
    await updateServiceStatus(
      user.id,
      publicId,
      status as "active" | "paused" | "deleted" | "draft",
    );
  else await updateJobStatus(user.id, publicId, status);
  revalidatePath("/sell");
  return { ok: true as const };
}

export async function contactSellerAction(sellerId: string) {
  return startConversationAction(sellerId);
}

export async function reportListingAction(
  targetType: string,
  targetId: string,
  reason: string,
) {
  const user = await requireUser();
  await reportTarget({
    reporterId: user.id,
    targetType,
    targetId,
    reason,
  });
  return { ok: true as const };
}

export async function updateUserLocationAction(formData: FormData) {
  const user = await requireUser();
  await db.userLocation.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      city: String(formData.get("city") ?? "") || null,
      country: String(formData.get("country") ?? "NL"),
      latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
      longitude: formData.get("longitude")
        ? Number(formData.get("longitude"))
        : null,
      shareLocation: formData.get("shareLocation") === "on",
      sharePrecise: formData.get("sharePrecise") === "on",
    },
    update: {
      city: String(formData.get("city") ?? "") || null,
      country: String(formData.get("country") ?? "NL"),
      latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
      longitude: formData.get("longitude")
        ? Number(formData.get("longitude"))
        : null,
      shareLocation: formData.get("shareLocation") === "on",
      sharePrecise: formData.get("sharePrecise") === "on",
    },
  });
  revalidatePath("/settings");
  revalidatePath("/map");
  return { ok: true as const };
}
