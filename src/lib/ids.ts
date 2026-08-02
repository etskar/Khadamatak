import { customAlphabet } from "nanoid";

const alphabet = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const nano = customAlphabet(alphabet, 10);
const nanoLong = customAlphabet(alphabet, 16);

export function createWalletPublicId() {
  return `KH-${nano()}`;
}

export function createTransactionReference() {
  return `KH-TX-${nanoLong()}`;
}

export function createEscrowPublicId() {
  return `KH-ES-${nano()}`;
}

export function createDisputePublicId() {
  return `KH-DP-${nano()}`;
}

export function createPaymentRequestPublicId() {
  return `KH-PR-${nano()}`;
}

export function createShareToken() {
  return nanoLong() + nano();
}

export function createProductPublicId() {
  return `KH-PD-${nano()}`;
}

export function createServicePublicId() {
  return `KH-SV-${nano()}`;
}

export function createRequestPublicId() {
  return `KH-RQ-${nano()}`;
}

export function createOrderPublicId() {
  return `KH-OR-${nano()}`;
}

export function createDealPublicId() {
  return `KH-DL-${nano()}`;
}

export function createOfferPublicId() {
  return `KH-OF-${nano()}`;
}

export function createInvoiceNumber() {
  return `INV-${nanoLong()}`;
}

export function slugifyUsername(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}
