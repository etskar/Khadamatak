import "server-only";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDbPath() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const raw = url.startsWith("file:") ? url.slice("file:".length) : url;
  if (path.isAbsolute(raw)) return raw;
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    raw.replace(/^\.\//, ""),
  );
}

function createPrismaClient() {
  const dbPath = resolveDbPath();
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
