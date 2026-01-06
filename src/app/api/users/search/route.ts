// src/app/api/users/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q");

        if (!query || query.length < 2) {
            return NextResponse.json([]);
        }

        // Search users by email or name
        const users = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { email: { contains: query, mode: "insensitive" } },
                            { name: { contains: query, mode: "insensitive" } },
                        ],
                    },
                    // Exclude current user
                    { email: { not: session.user.email } },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
            },
            take: 5,
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("User search error:", error);
        return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
    }
}
