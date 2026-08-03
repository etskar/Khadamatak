import "server-only";
import { db } from "@/lib/db";

export async function isUserVerified(userId: string) {
  const v = await db.identityVerification.findUnique({ where: { userId } });
  return v?.status === "verified";
}
