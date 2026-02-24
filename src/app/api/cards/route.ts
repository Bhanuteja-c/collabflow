// src/app/api/cards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { Activity } from "@/lib/activity";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { generateKeyBetween } from "fractional-indexing";

// POST /api/cards - Create a new card
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Rate limit check
        const rl = checkRateLimit(`card:${userId}`, RATE_LIMITS.write);
        if (!rl.success) {
            return NextResponse.json(
                { error: "Too many requests. Please wait." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
            );
        }

        const body = await req.json();
        const { title, description, columnId, priority, assigneeId, dueDate, startDate, labels, status } = body;

        // Get the last card for both integer order and fractional orderKey
        const lastCard = await prisma.card.findFirst({
            where: { columnId },
            orderBy: { orderKey: "desc" },
        });

        // Generate fractional key after the last card
        const newOrderKey = generateKeyBetween(lastCard?.orderKey ?? null, null);

        // Get column and board info for activity logging
        const column = await prisma.column.findUnique({
            where: { id: columnId },
            include: {
                board: {
                    select: { workspaceId: true }
                }
            }
        });

        const card = await prisma.card.create({
            data: {
                title: title || "New Task",
                description,
                columnId,
                order: (lastCard?.order ?? -1) + 1,
                orderKey: newOrderKey,
                ...(priority && { priority }),
                ...(assigneeId && { assigneeId }),
                ...(dueDate && { dueDate: new Date(dueDate) }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(labels && { labels }),
                ...(status && { status }),
            },
            include: {
                assignee: {
                    select: { id: true, name: true, image: true },
                },
            },
        });

        // Log activity
        if (column?.board?.workspaceId) {
            Activity.cardCreated(userId, column.board.workspaceId, card.id, card.title);
        }

        // Return enriched card with all fields for consistent client-side state
        const enrichedCard = {
            id: card.id,
            title: card.title,
            description: card.description,
            order: card.order,
            priority: card.priority,
            dueDate: card.dueDate,
            startDate: card.startDate,
            labels: card.labels,
            status: card.status,
            assigneeId: card.assigneeId,
            assignee: card.assignee,
            commentsCount: 0,
            checklistTotal: 0,
            checklistCompleted: 0,
            createdAt: card.createdAt,
            updatedAt: card.updatedAt,
        };

        return NextResponse.json(enrichedCard);
    } catch (error) {
        console.error("Error creating card:", error);
        return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
    }
}

// PUT /api/cards - Update card positions (for drag and drop)
export async function PUT(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const body = await req.json();
        const { cardId, columnId, order, orderKey } = body;

        // Get current card state before update
        const oldCard = await prisma.card.findUnique({
            where: { id: cardId },
            include: {
                column: {
                    include: {
                        board: { select: { workspaceId: true } }
                    }
                }
            }
        });

        const card = await prisma.card.update({
            where: { id: cardId },
            data: {
                columnId,
                order,
                ...(orderKey && { orderKey }),
            },
            include: {
                column: { select: { title: true } }
            }
        });

        // Log activity if column changed (card was moved)
        if (oldCard && oldCard.columnId !== columnId && oldCard.column?.board?.workspaceId) {
            const newColumn = await prisma.column.findUnique({
                where: { id: columnId },
                select: { title: true }
            });
            Activity.cardMoved(
                userId,
                oldCard.column.board.workspaceId,
                cardId,
                card.title,
                oldCard.column.title,
                newColumn?.title || "Unknown"
            );
        }

        return NextResponse.json(card);
    } catch (error) {
        console.error("Error updating card:", error);
        return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
    }
}
