import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";

if (typeof window !== "undefined") {
  throw new Error("prisma/client should only be imported in server-side code");
}

function normalizePostgresSslMode(url: string) {
  try {
    const parsed = new URL(url);
    const sslMode = parsed.searchParams.get("sslmode");

    if (
      sslMode === "prefer" ||
      sslMode === "require" ||
      sslMode === "verify-ca"
    ) {
      parsed.searchParams.set("sslmode", "verify-full");
    }

    return parsed.toString();
  } catch {
    return url.replace(
      /sslmode=(prefer|require|verify-ca)/,
      "sslmode=verify-full",
    );
  }
}

const globalForPrisma = globalThis as typeof globalThis & {
  prismaPool?: Pool;
  prisma?: PrismaClient;
};

function numberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required. Set it to your Postgres connection string.",
    );
  }

  const pool =
    globalForPrisma.prismaPool ||
    new Pool({
      connectionString: normalizePostgresSslMode(connectionString),
      max: numberEnv("PG_POOL_MAX", process.env.VERCEL ? 1 : 10),
      idleTimeoutMillis: numberEnv("PG_POOL_IDLE_TIMEOUT_MS", 10_000),
      connectionTimeoutMillis: numberEnv("PG_POOL_CONNECTION_TIMEOUT_MS", 10_000),
    });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPool = pool;
    globalForPrisma.prisma = client;
  }

  return client;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { prisma };
