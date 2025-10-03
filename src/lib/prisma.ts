import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODEV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODEV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
