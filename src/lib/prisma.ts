// Prisma 7 client com Driver Adapter (pg).
// O adapter é necessário em Prisma 7 — o engine binário foi removido.
// A connection string vem de DATABASE_URL (pgbouncer pooler em produção).

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prismaClient: PrismaClient | undefined;
}

function makeClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
}

export const prisma = globalThis.prismaClient ?? makeClient();

if (process.env.NODE_ENV !== "production") globalThis.prismaClient = prisma;
