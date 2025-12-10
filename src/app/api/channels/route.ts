// src/app/api/channels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// GET /api/channels - List user's channels
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        const channels = await prisma.channel.findMany({
            where: {
                members: {
                    some: { userId },
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, image: true },
                        },
                    },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: {
                        author: {
                            select: { id: true, name: true, image: true },
                        },
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(channels);
    } catch (error) {
        console.error("[API/channels] Error:", error);
        return NextResponse.json({
            error: "Failed to fetch channels",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// POST /api/channels - Create a new channel
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const body = await req.json();
        const { name, type = "public" } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
        }

        const channel = await prisma.channel.create({
            data: {
                name: name.trim(),
                type,
                createdById: userId,
                members: {
                    create: {
                        userId,
                        role: "admin",
                    },
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, image: true },
                        },
                    },
                },
            },
        });

        return NextResponse.json(channel);
    } catch (error) {
        console.error("[API/channels] Error:", error);
        return NextResponse.json({
            error: "Failed to create channel",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
