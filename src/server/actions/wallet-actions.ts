"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { parseAmountToCents } from "@/lib/money";
import { generateSecureToken } from "@/lib/crypto";
import {
  buildIdempotencyKey,
  resolveWalletRecipient,
  setWalletPin,
  transferBetweenWallets,
} from "@/server/finance/wallet-service";
import {
  createPaymentRequest,
  payPaymentRequest,
  startWalletTopUp,
} from "@/server/finance/payment-service";
import {
  confirmEscrowDelivery,
  createEscrow,
  markEscrowDelivered,
  openDispute,
} from "@/server/finance/escrow-service";
import { db } from "@/lib/db";
import { canPerformVerifiedAction } from "@/server/users/verification-service";
import QRCode from "qrcode";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user;
}

async function requireVerified(userId: string) {
  const v = await db.identityVerification.findUnique({ where: { userId } });
  if (!canPerformVerifiedAction(v?.status)) {
    throw new Error("VERIFICATION_REQUIRED");
  }
}

export async function topUpWalletAction(formData: FormData) {
  const user = await requireUser();
  const amount = parseAmountToCents(String(formData.get("amount") ?? ""));
  const locale = String(formData.get("locale") ?? "ar");

  const result = await startWalletTopUp({
    userId: user.id,
    amountCents: amount,
    method: "ideal",
    locale,
    returnPath: `/${locale}/wallet?topup=done`,
  });

  revalidatePath("/wallet");
  return { ok: true as const, ...result };
}

export async function lookupRecipientAction(query: string) {
  await requireUser();
  const wallet = await resolveWalletRecipient(query);
  if (!wallet) return { ok: false as const, error: "NOT_FOUND" };
  return {
    ok: true as const,
    recipient: {
      walletId: wallet.walletId,
      walletUsername: wallet.walletUsername,
      displayName: wallet.user.profile?.displayName ?? wallet.walletUsername,
      avatarUrl: wallet.user.profile?.avatarUrl ?? null,
      userId: wallet.userId,
    },
  };
}

export async function transferAction(formData: FormData) {
  const user = await requireUser();
  await requireVerified(user.id);

  const to = String(formData.get("to") ?? "");
  const amount = parseAmountToCents(String(formData.get("amount") ?? ""));
  const notes = String(formData.get("notes") ?? "") || undefined;
  const pin = String(formData.get("pin") ?? "") || undefined;
  const idem =
    String(formData.get("idempotencyKey") ?? "") ||
    buildIdempotencyKey(user.id, "transfer", `${to}:${amount}:${generateSecureToken(8)}`);

  const tx = await transferBetweenWallets({
    fromUserId: user.id,
    toWalletQuery: to,
    amountCents: amount,
    notes,
    pin,
    idempotencyKey: idem,
  });

  revalidatePath("/wallet");
  return { ok: true as const, reference: tx.reference, id: tx.id };
}

export async function setPinAction(formData: FormData) {
  const user = await requireUser();
  await setWalletPin(user.id, String(formData.get("pin") ?? ""));
  revalidatePath("/wallet");
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function createPaymentRequestAction(formData: FormData) {
  const user = await requireUser();
  await requireVerified(user.id);

  const amount = parseAmountToCents(String(formData.get("amount") ?? ""));
  const description = String(formData.get("description") ?? "");
  const toUserId = String(formData.get("toUserId") ?? "") || null;

  const pr = await createPaymentRequest({
    fromUserId: user.id,
    toUserId,
    amountCents: amount,
    description,
  });

  revalidatePath("/wallet");
  return {
    ok: true as const,
    publicId: pr.publicId,
    shareToken: pr.shareToken,
    payPath: `/wallet/pay/${pr.shareToken}`,
  };
}

export async function payRequestAction(formData: FormData) {
  const user = await requireUser();
  await requireVerified(user.id);

  const shareToken = String(formData.get("shareToken") ?? "");
  const pin = String(formData.get("pin") ?? "") || undefined;
  const idem =
    String(formData.get("idempotencyKey") ?? "") ||
    buildIdempotencyKey(user.id, "pay_request", shareToken);

  const result = await payPaymentRequest({
    payerUserId: user.id,
    shareToken,
    idempotencyKey: idem,
    pin,
  });

  revalidatePath("/wallet");
  return { ok: true as const, reference: result.transaction.reference };
}

export async function getWalletQrAction() {
  const user = await requireUser();
  const wallet = await db.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet) throw new Error("WALLET_NOT_FOUND");
  const payload = JSON.stringify({
    type: "khadamatak_wallet",
    walletId: wallet.walletId,
    username: wallet.walletUsername,
  });
  const dataUrl = await QRCode.toDataURL(payload, {
    margin: 1,
    width: 280,
    color: { dark: "#0f766e", light: "#ffffff" },
  });
  return { ok: true as const, dataUrl, walletId: wallet.walletId };
}

export async function createEscrowAction(formData: FormData) {
  const user = await requireUser();
  await requireVerified(user.id);

  const sellerQuery = String(formData.get("seller") ?? "");
  const amount = parseAmountToCents(String(formData.get("amount") ?? ""));
  const description = String(formData.get("description") ?? "") || undefined;
  const seller = await resolveWalletRecipient(sellerQuery);
  if (!seller) throw new Error("RECIPIENT_NOT_FOUND");

  const escrow = await createEscrow({
    buyerId: user.id,
    sellerId: seller.userId,
    amountCents: amount,
    description,
    idempotencyKey: buildIdempotencyKey(
      user.id,
      "escrow",
      `${seller.userId}:${amount}:${generateSecureToken(6)}`,
    ),
  });

  revalidatePath("/wallet");
  return { ok: true as const, publicId: escrow.publicId };
}

export async function markDeliveredAction(escrowPublicId: string) {
  const user = await requireUser();
  await markEscrowDelivered({ escrowPublicId, sellerId: user.id });
  revalidatePath("/wallet");
  return { ok: true as const };
}

export async function confirmDeliveryAction(escrowPublicId: string) {
  const user = await requireUser();
  await confirmEscrowDelivery({
    escrowPublicId,
    buyerId: user.id,
    idempotencyKey: buildIdempotencyKey(user.id, "escrow_confirm", escrowPublicId),
  });
  revalidatePath("/wallet");
  return { ok: true as const };
}

export async function openDisputeAction(formData: FormData) {
  const user = await requireUser();
  const escrowPublicId = String(formData.get("escrowPublicId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const dispute = await openDispute({
    escrowPublicId,
    openerId: user.id,
    reason,
  });
  revalidatePath("/wallet");
  return { ok: true as const, publicId: dispute.publicId };
}
