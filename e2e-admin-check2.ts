import "dotenv/config";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client";

dotenv.config({ path: ".env.local" });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const a = await db.adminUser.findFirst({
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  const keys = a?.role.permissions.map((p) => p.permission.permissionKey) ?? [];
  console.log("count:", keys.length);
  const removed = keys.filter((k) =>
    /^(orders|escrow|wallets|payments|disputes|finance)/.test(k),
  );
  console.log("removed-feature keys:", removed.join(", ") || "none");
  console.log("sample:", keys.slice(0, 15).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
