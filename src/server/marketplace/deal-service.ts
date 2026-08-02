import "server-only";
import { db } from "@/lib/db";
import {
  createDealPublicId,
  createOfferPublicId,
  createOrderPublicId,
  createInvoiceNumber,
} from "@/lib/ids";
import { writeAuditLog } from "@/lib/audit";
import { createEscrow } from "@/server/finance/escrow-service";
import { buildIdempotencyKey } from "@/server/finance/wallet-service";
import { generateSecureToken } from "@/lib/crypto";
import { calculateFees } from "./commission";
import { assertVerifiedSeller } from "./guards";

export async function createOffer(input: {
  buyerId: string;
  productPublicId?: string;
  servicePublicId?: string;
  amountCents: number;
  message?: string;
}) {
  if (input.amountCents < 1) throw new Error("INVALID_AMOUNT");
  await assertVerifiedSeller(input.buyerId);

  let sellerId = "";
  let productId: string | null = null;
  let serviceId: string | null = null;

  if (input.productPublicId) {
    const p = await db.product.findUnique({ where: { publicId: input.productPublicId } });
    if (!p || p.status !== "active") throw new Error("PRODUCT_UNAVAILABLE");
    if (p.sellerId === input.buyerId) throw new Error("CANNOT_OFFER_OWN");
    sellerId = p.sellerId;
    productId = p.id;
  } else if (input.servicePublicId) {
    const s = await db.service.findUnique({ where: { publicId: input.servicePublicId } });
    if (!s || s.status !== "active") throw new Error("SERVICE_UNAVAILABLE");
    if (s.providerId === input.buyerId) throw new Error("CANNOT_OFFER_OWN");
    sellerId = s.providerId;
    serviceId = s.id;
  } else {
    throw new Error("TARGET_REQUIRED");
  }

  const offer = await db.offer.create({
    data: {
      publicId: createOfferPublicId(),
      buyerId: input.buyerId,
      sellerId,
      productId,
      serviceId,
      amountCents: input.amountCents,
      message: input.message,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
    },
  });

  await db.notification.create({
    data: {
      userId: sellerId,
      type: "offer",
      title: "New offer",
      body: input.message || `${(input.amountCents / 100).toFixed(2)} EUR`,
      href: `/deals?offer=${offer.publicId}`,
    },
  });

  return offer;
}

export async function respondOffer(input: {
  sellerId: string;
  offerPublicId: string;
  accept: boolean;
}) {
  const offer = await db.offer.findUnique({
    where: { publicId: input.offerPublicId },
    include: { product: true, service: true },
  });
  if (!offer || offer.sellerId !== input.sellerId) throw new Error("FORBIDDEN");
  if (offer.status !== "pending") throw new Error("INVALID_STATUS");

  if (!input.accept) {
    return db.offer.update({
      where: { id: offer.id },
      data: { status: "rejected" },
    });
  }

  await assertVerifiedSeller(offer.sellerId);
  await assertVerifiedSeller(offer.buyerId);

  const deal = await db.$transaction(async (tx) => {
    await tx.offer.update({
      where: { id: offer.id },
      data: { status: "accepted" },
    });

    return tx.deal.create({
      data: {
        publicId: createDealPublicId(),
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        productId: offer.productId,
        serviceId: offer.serviceId,
        offerId: offer.id,
        amountCents: offer.amountCents,
        terms: offer.message,
        status: "accepted",
        paymentStatus: "unpaid",
        acceptedAt: new Date(),
        events: {
          create: {
            actorId: input.sellerId,
            type: "accepted",
            message: "Offer accepted — deal created",
          },
        },
      },
    });
  });

  await db.notification.create({
    data: {
      userId: offer.buyerId,
      type: "deal",
      title: "Offer accepted",
      body: "Pay now to lock funds in escrow",
      href: `/deals/${deal.publicId}`,
    },
  });

  return deal;
}

export async function createDeal(input: {
  buyerId: string;
  sellerId: string;
  productPublicId?: string;
  servicePublicId?: string;
  requestPublicId?: string;
  amountCents: number;
  terms?: string;
}) {
  if (input.buyerId === input.sellerId) throw new Error("INVALID_PARTIES");
  await assertVerifiedSeller(input.buyerId);
  await assertVerifiedSeller(input.sellerId);

  let productId: string | null = null;
  let serviceId: string | null = null;
  let requestId: string | null = null;

  if (input.productPublicId) {
    const p = await db.product.findUnique({ where: { publicId: input.productPublicId } });
    if (!p) throw new Error("PRODUCT_NOT_FOUND");
    productId = p.id;
  }
  if (input.servicePublicId) {
    const s = await db.service.findUnique({ where: { publicId: input.servicePublicId } });
    if (!s) throw new Error("SERVICE_NOT_FOUND");
    serviceId = s.id;
  }
  if (input.requestPublicId) {
    const r = await db.marketRequest.findUnique({
      where: { publicId: input.requestPublicId },
    });
    if (!r) throw new Error("REQUEST_NOT_FOUND");
    requestId = r.id;
  }

  const deal = await db.deal.create({
    data: {
      publicId: createDealPublicId(),
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      productId,
      serviceId,
      requestId,
      amountCents: input.amountCents,
      terms: input.terms,
      status: "proposed",
      events: {
        create: {
          actorId: input.buyerId,
          type: "proposed",
          message: input.terms || "Deal proposed",
        },
      },
    },
  });

  await db.notification.create({
    data: {
      userId: input.sellerId,
      type: "deal",
      title: "New deal proposal",
      body: input.terms || "Open to review",
      href: `/deals/${deal.publicId}`,
    },
  });

  return deal;
}

export async function acceptDeal(input: { dealPublicId: string; sellerId: string }) {
  const deal = await db.deal.findUnique({ where: { publicId: input.dealPublicId } });
  if (!deal || deal.sellerId !== input.sellerId) throw new Error("FORBIDDEN");
  if (deal.status !== "proposed") throw new Error("INVALID_STATUS");

  const updated = await db.deal.update({
    where: { id: deal.id },
    data: { status: "accepted", acceptedAt: new Date() },
  });

  await db.dealEvent.create({
    data: {
      dealId: deal.id,
      actorId: input.sellerId,
      type: "accepted",
      message: "Seller accepted deal",
    },
  });

  await db.notification.create({
    data: {
      userId: deal.buyerId,
      type: "deal",
      title: "Deal accepted",
      body: "Pay to secure escrow",
      href: `/deals/${deal.publicId}`,
    },
  });

  return updated;
}

export async function rejectDeal(input: { dealPublicId: string; userId: string }) {
  const deal = await db.deal.findUnique({ where: { publicId: input.dealPublicId } });
  if (!deal) throw new Error("NOT_FOUND");
  if (deal.buyerId !== input.userId && deal.sellerId !== input.userId) {
    throw new Error("FORBIDDEN");
  }
  if (!["proposed", "accepted"].includes(deal.status)) throw new Error("INVALID_STATUS");

  const updated = await db.deal.update({
    where: { id: deal.id },
    data: { status: "rejected" },
  });

  await db.dealEvent.create({
    data: {
      dealId: deal.id,
      actorId: input.userId,
      type: "rejected",
      message: "Deal rejected",
    },
  });

  return updated;
}

export async function payDeal(input: { dealPublicId: string; buyerId: string }) {
  const deal = await db.deal.findUnique({
    where: { publicId: input.dealPublicId },
    include: { product: true, service: true },
  });
  if (!deal || deal.buyerId !== input.buyerId) throw new Error("FORBIDDEN");
  if (!["accepted", "proposed"].includes(deal.status)) throw new Error("INVALID_STATUS");
  if (deal.paymentStatus === "secured") throw new Error("ALREADY_PAID");

  const fees = await calculateFees(deal.amountCents);
  const escrow = await createEscrow({
    buyerId: deal.buyerId,
    sellerId: deal.sellerId,
    amountCents: deal.amountCents,
    description: `Deal ${deal.publicId}`,
    idempotencyKey: buildIdempotencyKey(
      deal.buyerId,
      "deal_pay",
      `${deal.id}:${generateSecureToken(6)}`,
    ),
    orderRef: deal.publicId,
  });

  const result = await db.$transaction(async (tx) => {
    const order = await tx.marketOrder.create({
      data: {
        publicId: createOrderPublicId(),
        buyerId: deal.buyerId,
        sellerId: deal.sellerId,
        productId: deal.productId,
        serviceId: deal.serviceId,
        amountCents: fees.amountCents,
        platformFeeCents: fees.platformFeeCents,
        sellerAmountCents: fees.sellerAmountCents,
        status: "payment_secured",
        paymentStatus: "secured",
        deliveryStatus: "awaiting_shipment",
        escrowId: escrow.id,
        paidAt: new Date(),
      },
    });

    await tx.invoice.create({
      data: {
        invoiceNumber: createInvoiceNumber(),
        orderId: order.id,
        buyerId: deal.buyerId,
        sellerId: deal.sellerId,
        itemTitle: deal.product?.title || deal.service?.title || `Deal ${deal.publicId}`,
        amountCents: fees.amountCents,
        platformFeeCents: fees.platformFeeCents,
        totalCents: fees.amountCents,
        paymentStatus: "paid",
      },
    });

    const updated = await tx.deal.update({
      where: { id: deal.id },
      data: {
        status: "in_escrow",
        paymentStatus: "secured",
        escrowId: escrow.id,
        orderId: order.id,
      },
    });

    await tx.dealEvent.create({
      data: {
        dealId: deal.id,
        actorId: input.buyerId,
        type: "paid_escrow",
        message: "Payment locked in escrow",
      },
    });

    await tx.escrow.update({
      where: { id: escrow.id },
      data: { orderRef: order.publicId },
    });

    return { deal: updated, order };
  });

  await db.notification.create({
    data: {
      userId: deal.sellerId,
      type: "deal",
      title: "Deal paid",
      body: "Funds secured in escrow",
      href: `/deals/${deal.publicId}`,
    },
  });

  await writeAuditLog({
    actorUserId: input.buyerId,
    action: "deal.pay",
    entityType: "Deal",
    entityId: deal.id,
  });

  return result;
}

export async function getDeal(publicId: string, userId: string) {
  const deal = await db.deal.findUnique({
    where: { publicId },
    include: {
      buyer: { include: { profile: true } },
      seller: { include: { profile: true, verification: true } },
      product: { include: { media: true } },
      service: { include: { media: true } },
      request: true,
      escrow: true,
      order: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!deal) return null;
  if (deal.buyerId !== userId && deal.sellerId !== userId) throw new Error("FORBIDDEN");
  return deal;
}

export async function listUserDeals(userId: string) {
  return db.deal.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      product: { include: { media: true } },
      service: { include: { media: true } },
      buyer: { include: { profile: true } },
      seller: { include: { profile: true } },
    },
  });
}

export async function listUserOffers(userId: string) {
  return db.offer.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
      service: true,
      buyer: { include: { profile: true } },
      seller: { include: { profile: true } },
    },
  });
}
