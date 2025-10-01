import { PrismaClient } from "@prisma/client";

// Conexión principal con pool
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Conexión directa para operaciones que causan problemas con prepared statements
const globalForDirectPrisma = globalThis as unknown as {
  directPrisma?: PrismaClient;
};

export const directPrisma =
  globalForDirectPrisma.directPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: process.env.DIRECT_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForDirectPrisma.directPrisma = directPrisma;
}
