// src/app/api/users/route.ts
// API for searching/listing users
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/users - List users (for DM selection)
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || "";
        const limit = parseInt(searchParams.get("limit") || "20");

        const users = await prisma.user.findMany({
            where: {
                id: { not: session.user.id }, // Exclude self
                ...(query ? {
                    OR: [
                        { name: { contains: query, mode: "insensitive" as const } },
                        { email: { contains: query, mode: "insensitive" as const } }
                    ]
                } : {})
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true
            },
            take: limit,
            orderBy: { name: "asc" }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("[API/users] GET Error:", error);
        return NextResponse.json({
            error: "Failed to fetch users",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
