// src/lib/ensureUser.ts
// Utility to ensure user exists in database (handles reset scenarios)
import { prisma } from "./prisma";

interface SessionUser {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
}

export async function ensureUser(sessionUser: SessionUser): Promise<string> {
    if (!sessionUser.id) {
        throw new Error("No user ID in session");
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
        where: { id: sessionUser.id },
    });

    if (existing) {
        return existing.id;
    }

    // User doesn't exist (maybe DB was reset), create them
    console.log("[ensureUser] Creating user:", sessionUser.id);

    const user = await prisma.user.create({
        data: {
            id: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.name,
            image: sessionUser.image,
        },
    });

    return user.id;
}
