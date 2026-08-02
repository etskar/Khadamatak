"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { parseAmountToCents } from "@/lib/money";
import { createProduct, updateProductStatus } from "@/server/marketplace/product-service";
import { createService, updateServiceStatus } from "@/server/marketplace/service-service";
import { createRequest } from "@/server/marketplace/request-service";
import {
  confirmOrderCompletion,
  createProductOrder,
  createServiceOrder,
  markOrderDelivered,
} from "@/server/marketplace/order-service";
import {
  acceptDeal,
  createDeal,
  createOffer,
  payDeal,
  rejectDeal,
  respondOffer,
} from "@/server/marketplace/deal-service";
import { createReview } from "@/server/marketplace/review-service";
import { toggleFavorite } from "@/server/marketplace/favorite-service";
import {
  createGroupPost,
  requestJoinGroup,
} from "@/server/marketplace/group-service";
import { reportTarget } from "@/server/social/post-service";
import { startConversationAction } from "@/server/actions/social-actions";
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
  const files = formData.getAll("media");
  for (const f of files) {
    if (f instanceof File && f.size > 0) {
      media.push(await saveMedia(f, "products"));
    }
  }

  const product = await createProduct({
    sellerId: user.id,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    categoryId: String(formData.get("categoryId") ?? "") || null,
    priceCents: parseAmountToCents(String(formData.get("price") ?? "0")),
    condition: String(formData.get("condition") ?? "used"),
    city: String(formData.get("city") ?? "") || undefined,
    country: String(formData.get("country") ?? "NL"),
    addressLine: String(formData.get("addressLine") ?? "") || undefined,
    latitude: formData.get("latitude")
      ? Number(formData.get("latitude"))
      : null,
    longitude: formData.get("longitude")
      ? Number(formData.get("longitude"))
      : null,
    groupId: String(formData.get("groupId") ?? "") || null,
    media,
    status: "active",
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

export async function createRequestAction(formData: FormData) {
  const user = await requireUser();
  const budget = String(formData.get("budget") ?? "").trim();
  const neededAtRaw = String(formData.get("neededAt") ?? "");
  const request = await createRequest({
    ownerId: user.id,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    categoryId: String(formData.get("categoryId") ?? "") || null,
    budgetCents: budget ? parseAmountToCents(budget) : null,
    startLocation: String(formData.get("startLocation") ?? "") || undefined,
    destination: String(formData.get("destination") ?? "") || undefined,
    neededAt: neededAtRaw ? new Date(neededAtRaw) : null,
    groupId: String(formData.get("groupId") ?? "") || null,
  });
  revalidatePath("/requests");
  return { ok: true as const, publicId: request.publicId };
}

export async function buyProductAction(productPublicId: string) {
  const user = await requireUser();
  const order = await createProductOrder({
    buyerId: user.id,
    productPublicId,
  });
  revalidatePath("/orders");
  revalidatePath(`/products/${productPublicId}`);
  return { ok: true as const, orderPublicId: order.publicId };
}

export async function bookServiceAction(formData: FormData) {
  const user = await requireUser();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const order = await createServiceOrder({
    buyerId: user.id,
    servicePublicId: String(formData.get("servicePublicId") ?? ""),
    amountCents: amountRaw ? parseAmountToCents(amountRaw) : undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath("/orders");
  return { ok: true as const, orderPublicId: order.publicId };
}

export async function markOrderDeliveredAction(orderPublicId: string) {
  const user = await requireUser();
  await markOrderDelivered({ orderPublicId, sellerId: user.id });
  revalidatePath(`/orders/${orderPublicId}`);
  return { ok: true as const };
}

export async function confirmOrderAction(orderPublicId: string) {
  const user = await requireUser();
  await confirmOrderCompletion({ orderPublicId, buyerId: user.id });
  revalidatePath(`/orders/${orderPublicId}`);
  return { ok: true as const };
}

export async function createOfferAction(formData: FormData) {
  const user = await requireUser();
  const offer = await createOffer({
    buyerId: user.id,
    productPublicId: String(formData.get("productPublicId") ?? "") || undefined,
    servicePublicId: String(formData.get("servicePublicId") ?? "") || undefined,
    amountCents: parseAmountToCents(String(formData.get("amount") ?? "")),
    message: String(formData.get("message") ?? "") || undefined,
  });
  revalidatePath("/deals");
  return { ok: true as const, publicId: offer.publicId };
}

export async function respondOfferAction(offerPublicId: string, accept: boolean) {
  const user = await requireUser();
  const result = await respondOffer({
    sellerId: user.id,
    offerPublicId,
    accept,
  });
  revalidatePath("/deals");
  return {
    ok: true as const,
    dealPublicId: "publicId" in result ? result.publicId : undefined,
  };
}

export async function createDealAction(formData: FormData) {
  const user = await requireUser();
  const deal = await createDeal({
    buyerId: user.id,
    sellerId: String(formData.get("sellerId") ?? ""),
    productPublicId: String(formData.get("productPublicId") ?? "") || undefined,
    servicePublicId: String(formData.get("servicePublicId") ?? "") || undefined,
    requestPublicId: String(formData.get("requestPublicId") ?? "") || undefined,
    amountCents: parseAmountToCents(String(formData.get("amount") ?? "")),
    terms: String(formData.get("terms") ?? "") || undefined,
  });
  revalidatePath("/deals");
  return { ok: true as const, publicId: deal.publicId };
}

export async function acceptDealAction(dealPublicId: string) {
  const user = await requireUser();
  await acceptDeal({ dealPublicId, sellerId: user.id });
  revalidatePath(`/deals/${dealPublicId}`);
  return { ok: true as const };
}

export async function rejectDealAction(dealPublicId: string) {
  const user = await requireUser();
  await rejectDeal({ dealPublicId, userId: user.id });
  revalidatePath(`/deals/${dealPublicId}`);
  return { ok: true as const };
}

export async function payDealAction(dealPublicId: string) {
  const user = await requireUser();
  const result = await payDeal({ dealPublicId, buyerId: user.id });
  revalidatePath(`/deals/${dealPublicId}`);
  revalidatePath("/orders");
  return { ok: true as const, orderPublicId: result.order.publicId };
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

export async function createReviewAction(formData: FormData) {
  const user = await requireUser();
  await createReview({
    authorId: user.id,
    orderPublicId: String(formData.get("orderPublicId") ?? ""),
    rating: Number(formData.get("rating") ?? 5),
    content: String(formData.get("content") ?? "") || undefined,
  });
  revalidatePath("/orders");
  return { ok: true as const };
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
  kind: "product" | "service",
  publicId: string,
  status: "active" | "paused" | "deleted" | "draft",
) {
  const user = await requireUser();
  if (kind === "product") await updateProductStatus(user.id, publicId, status);
  else await updateServiceStatus(user.id, publicId, status);
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
