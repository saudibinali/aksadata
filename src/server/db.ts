import "server-only";
import { createPrismaClient, type AppPrisma } from "@/server/prisma";

const globalForPrisma = globalThis as unknown as { prisma?: AppPrisma };

export function getDb() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}
