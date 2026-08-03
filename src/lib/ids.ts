import { customAlphabet } from "nanoid";

const alphabet = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const nano = customAlphabet(alphabet, 10);

export function createProductPublicId() {
  return `KH-PD-${nano()}`;
}

export function createServicePublicId() {
  return `KH-SV-${nano()}`;
}

export function createJobPublicId() {
  return `KH-JB-${nano()}`;
}

export function slugifyUsername(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}
