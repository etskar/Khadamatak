import "server-only";
import { db } from "@/lib/db";
import {
  createInvoiceNumber,
  createOrderPublicId,
} from "@/lib/ids";
import { writeAuditLog } from "@/lib/audit";
import { createEscrow, confirmEscrowDelivery, markEscrowDelivered } from "@/server/finance/escrow-service";
import { buildIdempotencyKey } from "@/server/finance/wallet-service";
import { generateSecureToken } from "@/lib/crypto";
import { calculateFees } from "./commission";
import { assertVerifiedSeller } from "./guards";

export async function createProductOrder(input: {
  buyerId: string;
  productPublicId: string;
  notes?: string;
}) {
  const product = await db.product.findUnique({
    where: { publicId: input.productPublicId },
    include: { seller: true },
  });
  if (!product || product.status !== "active") throw new Error("PRODUCT_UNAVAILABLE");
  if (product.sellerId === input.buyerId) throw new Error("CANNOT_BUY_OWN");

  await assertVerifiedSeller(product.sellerId);
  await assertVerifiedSeller(input.buyerId);

  const fees = await calculateFees(product.priceCents);
  const idem = buildIdempotencyKey(
    input.buyerId,
    "order_product",
    `${product.id}:${generateSecureToken(6)}`,
  );

  // Lock funds in escrow first
  const escrow = await createEscrow({
    buyerId: input.buyerId,
    sellerId: product.sellerId,
    amountCents: product.priceCents,
    description: `Order: ${product.title}`,
    idempotencyKey: idem,
    orderRef: product.publicId,
  });

  const order = await db.$transaction(async (tx) => {
    const created = await tx.marketOrder.create({
      data: {
        publicId: createOrderPublicId(),
        buyerId: input.buyerId,
        sellerId: product.sellerId,
        productId: product.id,
        amountCents: fees.amountCents,
        platformFeeCents: fees.platformFeeCents,
        sellerAmountCents: fees.sellerAmountCents,
        currency: product.currency,
        status: "payment_secured",
        paymentStatus: "secured",
        deliveryStatus: "awaiting_shipment",
        escrowId: escrow.id,
        notes: input.notes,
        paidAt: new Date(),
      },
    });

    await tx.escrow.update({
      where: { id: escrow.id },
      data: { orderRef: created.publicId },
    });

    await tx.orderEvent.create({
      data: {
        orderId: created.id,
        actorId: input.buyerId,
        type: "created_paid",
        message: "Payment secured in escrow",
      },
    });

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber: createInvoiceNumber(),
        orderId: created.id,
        buyerId: input.buyerId,
        sellerId: product.sellerId,
        itemTitle: product.title,
        amountCents: fees.amountCents,
        platformFeeCents: fees.platformFeeCents,
        totalCents: fees.amountCents,
        currency: product.currency,
        paymentStatus: "paid",
        metadataJson: JSON.stringify(fees),
      },
    });

    await tx.marketOrder.update({
      where: { id: created.id },
      data: { invoiceId: invoice.id },
    });

    return created;
  });

  await db.notification.createMany({
    data: [
      {
        userId: product.sellerId,
        type: "order",
        title: "New order",
        body: product.title,
        href: `/orders/${order.publicId}`,
      },
      {
        userId: input.buyerId,
        type: "order",
        title: "Order placed",
        body: "Payment is secured in escrow",
        href: `/orders/${order.publicId}`,
      },
    ],
  });

  await writeAuditLog({
    actorUserId: input.buyerId,
    action: "order.create",
    entityType: "MarketOrder",
    entityId: order.id,
    metadata: { productId: product.id, escrowId: escrow.id, fees },
  });

  return order;
}

export async function createServiceOrder(input: {
  buyerId: string;
  servicePublicId: string;
  amountCents?: number;
  notes?: string;
}) {
  const service = await db.service.findUnique({
    where: { publicId: input.servicePublicId },
  });
  if (!service || service.status !== "active") throw new Error("SERVICE_UNAVAILABLE");
  if (service.providerId === input.buyerId) throw new Error("CANNOT_BUY_OWN");

  const amount =
    input.amountCents ??
    service.priceCents ??
    (() => {
      throw new Error("AMOUNT_REQUIRED");
    })();

  await assertVerifiedSeller(service.providerId);
  await assertVerifiedSeller(input.buyerId);

  const fees = await calculateFees(amount);
  const idem = buildIdempotencyKey(
    input.buyerId,
    "order_service",
    `${service.id}:${generateSecureToken(6)}`,
  );

  const escrow = await createEscrow({
    buyerId: input.buyerId,
    sellerId: service.providerId,
    amountCents: amount,
    description: `Service: ${service.title}`,
    idempotencyKey: idem,
    orderRef: service.publicId,
  });

  const order = await db.$transaction(async (tx) => {
    const created = await tx.marketOrder.create({
      data: {
        publicId: createOrderPublicId(),
        buyerId: input.buyerId,
        sellerId: service.providerId,
        serviceId: service.id,
        amountCents: fees.amountCents,
        platformFeeCents: fees.platformFeeCents,
        sellerAmountCents: fees.sellerAmountCents,
        currency: service.currency,
        status: "payment_secured",
        paymentStatus: "secured",
        deliveryStatus: "in_progress",
        escrowId: escrow.id,
        notes: input.notes,
        paidAt: new Date(),
      },
    });

    await tx.escrow.update({
      where: { id: escrow.id },
      data: { orderRef: created.publicId },
    });

    await tx.orderEvent.create({
      data: {
        orderId: created.id,
        actorId: input.buyerId,
        type: "created_paid",
        message: "Service payment secured in escrow",
      },
    });

    await tx.invoice.create({
      data: {
        invoiceNumber: createInvoiceNumber(),
        orderId: created.id,
        buyerId: input.buyerId,
        sellerId: service.providerId,
        itemTitle: service.title,
        amountCents: fees.amountCents,
        platformFeeCents: fees.platformFeeCents,
        totalCents: fees.amountCents,
        currency: service.currency,
        paymentStatus: "paid",
      },
    });

    return created;
  });

  await db.notification.createMany({
    data: [
      {
        userId: service.providerId,
        type: "order",
        title: "New service order",
        body: service.title,
        href: `/orders/${order.publicId}`,
      },
      {
        userId: input.buyerId,
        type: "order",
        title: "Service booked",
        body: "Payment secured in escrow",
        href: `/orders/${order.publicId}`,
      },
    ],
  });

  return order;
}

export async function markOrderDelivered(input: {
  orderPublicId: string;
  sellerId: string;
}) {
  const order = await db.marketOrder.findUnique({
    where: { publicId: input.orderPublicId },
    include: { escrow: true },
  });
  if (!order || order.sellerId !== input.sellerId) throw new Error("FORBIDDEN");
  if (!["payment_secured", "processing"].includes(order.status)) {
    throw new Error("INVALID_STATUS");
  }
  if (!order.escrow) throw new Error("ESCROW_MISSING");

  await markEscrowDelivered({
    escrowPublicId: order.escrow.publicId,
    sellerId: input.sellerId,
  });

  const updated = await db.marketOrder.update({
    where: { id: order.id },
    data: {
      status: "delivered",
      deliveryStatus: "delivered",
      deliveredAt: new Date(),
    },
  });

  await db.orderEvent.create({
    data: {
      orderId: order.id,
      actorId: input.sellerId,
      type: "delivered",
      message: "Seller marked as delivered",
    },
  });

  await db.notification.create({
    data: {
      userId: order.buyerId,
      type: "order",
      title: "Order delivered",
      body: "Please confirm completion to release funds",
      href: `/orders/${order.publicId}`,
    },
  });

  return updated;
}

export async function confirmOrderCompletion(input: {
  orderPublicId: string;
  buyerId: string;
}) {
  const order = await db.marketOrder.findUnique({
    where: { publicId: input.orderPublicId },
    include: { escrow: true, product: true, service: true },
  });
  if (!order || order.buyerId !== input.buyerId) throw new Error("FORBIDDEN");
  if (!["payment_secured", "processing", "delivered"].includes(order.status)) {
    throw new Error("INVALID_STATUS");
  }
  if (!order.escrow) throw new Error("ESCROW_MISSING");

  await confirmEscrowDelivery({
    escrowPublicId: order.escrow.publicId,
    buyerId: input.buyerId,
    idempotencyKey: buildIdempotencyKey(
      input.buyerId,
      "order_confirm",
      order.publicId,
    ),
  });

  // Apply platform commission from seller available after release
  // Seller received full amount via escrow; debit fee to platform revenue ledger note
  if (order.platformFeeCents > 0) {
    await db.auditLog.create({
      data: {
        actorUserId: input.buyerId,
        action: "order.commission_recorded",
        entityType: "MarketOrder",
        entityId: order.id,
        metadataJson: JSON.stringify({
          platformFeeCents: order.platformFeeCents,
          sellerAmountCents: order.sellerAmountCents,
        }),
      },
    });
  }

  const updated = await db.marketOrder.update({
    where: { id: order.id },
    data: {
      status: "completed",
      deliveryStatus: "completed",
      paymentStatus: "released",
      completedAt: new Date(),
    },
  });

  if (order.productId) {
    await db.product.update({
      where: { id: order.productId },
      data: { status: "sold" },
    });
  }

  await db.orderEvent.create({
    data: {
      orderId: order.id,
      actorId: input.buyerId,
      type: "completed",
      message: "Buyer confirmed — funds released",
    },
  });

  await db.notification.createMany({
    data: [
      {
        userId: order.sellerId,
        type: "order",
        title: "Order completed",
        body: "Funds released to your wallet",
        href: `/orders/${order.publicId}`,
      },
      {
        userId: order.buyerId,
        type: "order",
        title: "Order completed",
        body: "You can leave a review",
        href: `/orders/${order.publicId}`,
      },
    ],
  });

  return updated;
}

export async function getOrder(publicId: string, userId: string) {
  const order = await db.marketOrder.findUnique({
    where: { publicId },
    include: {
      buyer: { include: { profile: true } },
      seller: { include: { profile: true, verification: true } },
      product: { include: { media: true } },
      service: { include: { media: true } },
      escrow: true,
      invoice: true,
      review: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return null;
  if (order.buyerId !== userId && order.sellerId !== userId) {
    throw new Error("FORBIDDEN");
  }
  return order;
}

export async function listUserOrders(userId: string) {
  return db.marketOrder.findMany({
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
