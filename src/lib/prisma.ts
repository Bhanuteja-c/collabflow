// src/lib/prisma.ts — Prisma 7 client singleton
// Prisma 7 client with PostgreSQL adapter
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};
    
function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL!;
    const pool = new Pool({
        connectionString,
        max: 10,                   // Limit concurrent connections (prevents pool exhaustion)
        idleTimeoutMillis: 30000,  // Close idle connections after 30s
        connectionTimeoutMillis: 5000, // Fail fast if DB is unreachable
    });
    const adapter = new PrismaPg(pool);

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}


