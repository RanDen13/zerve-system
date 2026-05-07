import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";

if (typeof window !== "undefined") {
  throw new Error("prisma/client should only be imported in server-side code");
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required. Set it to your Postgres connection string.",
  );
}

const globalForPrisma = globalThis as typeof globalThis & {
  prismaPool?: Pool;
  prisma?: PrismaClient;
};

const pool =
  globalForPrisma.prismaPool ||
  new Pool({
    connectionString,
  });

const adapter = new PrismaPg(pool);
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prisma = prisma;
}

export { prisma };
