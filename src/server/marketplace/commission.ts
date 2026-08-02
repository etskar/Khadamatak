import "server-only";
import { db } from "@/lib/db";

export type FeeBreakdown = {
  amountCents: number;
  platformFeeCents: number;
  sellerAmountCents: number;
  feePercentBps: number;
  feeFixedCents: number;
};

export async function getPlatformSettings() {
  return db.platformSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function calculateFees(amountCents: number): Promise<FeeBreakdown> {
  if (amountCents < 1) throw new Error("INVALID_AMOUNT");
  const settings = await getPlatformSettings();
  const percentFee = Math.floor((amountCents * settings.feePercentBps) / 10_000);
  let platformFeeCents = percentFee + settings.feeFixedCents;
  if (platformFeeCents < settings.minFeeCents) {
    platformFeeCents = settings.minFeeCents;
  }
  if (platformFeeCents >= amountCents) {
    platformFeeCents = Math.max(0, amountCents - 1);
  }
  return {
    amountCents,
    platformFeeCents,
    sellerAmountCents: amountCents - platformFeeCents,
    feePercentBps: settings.feePercentBps,
    feeFixedCents: settings.feeFixedCents,
  };
}
