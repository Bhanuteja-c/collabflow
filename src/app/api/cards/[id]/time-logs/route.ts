// src/app/api/cards/[id]/time-logs/route.ts
// CRUD for card time logs - with workspace access control
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { checkCardWorkspaceAccess } from "@/lib/workspaceAccess";

// GET - Fetch time logs for a card
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Check workspace access
        const card = await checkCardWorkspaceAccess(id, userId);
        if (!card) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        const timeLogs = await prisma.timeLog.findMany({
            where: { cardId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(timeLogs);
    } catch (error) {
        console.error("Error fetching time logs:", error);
        return NextResponse.json({ error: "Failed to fetch time logs" }, { status: 500 });
    }
}

// POST - Log time to a card
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Check workspace access
        const card = await checkCardWorkspaceAccess(id, userId);
        if (!card) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        const body = await req.json();
        const { duration, description } = body;

        if (!duration || typeof duration !== "number" || duration <= 0) {
            return NextResponse.json(
                { error: "Duration must be a positive number (in minutes)" },
                { status: 400 }
            );
        }

        const timeLog = await prisma.timeLog.create({
            data: {
                duration: Math.round(duration),
                description: description?.trim() || null,
                cardId: id,
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });

        return NextResponse.json(timeLog);
    } catch (error) {
        console.error("Error creating time log:", error);
        return NextResponse.json({ error: "Failed to log time" }, { status: 500 });
    }
}
