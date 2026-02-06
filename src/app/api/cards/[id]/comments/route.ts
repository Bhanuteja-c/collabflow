// src/app/api/cards/[id]/comments/route.ts
// CRUD for card comments - with workspace access control
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { checkCardWorkspaceAccess } from "@/lib/workspaceAccess";

// GET - Fetch comments for a card
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

        const comments = await prisma.cardComment.findMany({
            where: { cardId: id },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error("Error fetching comments:", error);
        return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
    }
}

// POST - Add a comment to a card
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
        const { content } = body;

        if (!content?.trim()) {
            return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
        }

        const comment = await prisma.cardComment.create({
            data: {
                content: content.trim(),
                cardId: id,
                authorId: userId,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });

        return NextResponse.json(comment);
    } catch (error) {
        console.error("Error creating comment:", error);
        return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
    }
}
