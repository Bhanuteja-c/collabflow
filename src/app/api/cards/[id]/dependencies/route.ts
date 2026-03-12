// src/app/api/cards/[id]/dependencies/route.ts
// GET: List all dependencies for a card (both directions)
// POST: Create a dependency with cycle detection
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { emitToWorkspace } from "@/lib/socket";

// Simple workspace access check via card
async function checkCardWorkspaceAccess(cardId: string, userId: string) {
    const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
            column: {
                include: {
                    board: {
                        include: {
                            workspace: {
                                select: {
                                    id: true,
                                    members: {
                                        where: { userId },
                                        select: { id: true },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            board: {
                include: {
                    workspace: {
                        select: {
                            id: true,
                            members: {
                                where: { userId },
                                select: { id: true },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!card) return null;

    const board = card.column?.board || card.board;
    if (!board) return null;

    const isAuthor = board.authorId === userId;
    const isMember = board.workspace?.members && board.workspace.members.length > 0;

    if (!isAuthor && !isMember) return null;

    return { card, workspaceId: board.workspace?.id };
}

// BFS cycle detection: check if adding predecessorId -> successorId creates a cycle
async function wouldCreateCycle(predecessorId: string, successorId: string): Promise<boolean> {
    // If the successor already has a path back to the predecessor through the
    // dependency chain, adding this link would create a cycle.
    // We BFS from successorId following "blocks" edges to see if we reach predecessorId.
    const visited = new Set<string>();
    const queue = [successorId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (currentId === predecessorId) return true;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        // Find all cards that the current card blocks (predecessorId = currentId)
        const outgoing = await prisma.cardDependency.findMany({
            where: { predecessorId: currentId, type: "blocks" },
            select: { successorId: true },
        });

        for (const dep of outgoing) {
            if (!visited.has(dep.successorId)) {
                queue.push(dep.successorId);
            }
        }
    }

    return false;
}

// GET /api/cards/[id]/dependencies
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
        const access = await checkCardWorkspaceAccess(id, userId);
        if (!access) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        // Get dependencies where this card is the predecessor (this card blocks others)
        const blocking = await prisma.cardDependency.findMany({
            where: { predecessorId: id },
            include: {
                successor: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        issueType: true,
                        issueNumber: true,
                    },
                },
            },
        });

        // Get dependencies where this card is the successor (this card is blocked by others)
        const blockedBy = await prisma.cardDependency.findMany({
            where: { successorId: id },
            include: {
                predecessor: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        issueType: true,
                        issueNumber: true,
                    },
                },
            },
        });

        return NextResponse.json({
            blocking: blocking.map((d) => ({
                id: d.id,
                type: d.type,
                card: d.successor,
            })),
            blockedBy: blockedBy.map((d) => ({
                id: d.id,
                type: d.type,
                card: d.predecessor,
            })),
        });
    } catch (error) {
        console.error("Error fetching dependencies:", error);
        return NextResponse.json({ error: "Failed to fetch dependencies" }, { status: 500 });
    }
}

// POST /api/cards/[id]/dependencies
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
        const access = await checkCardWorkspaceAccess(id, userId);
        if (!access) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        const { targetCardId, type = "blocks", direction = "blocking" } = await req.json();

        if (!targetCardId) {
            return NextResponse.json({ error: "targetCardId is required" }, { status: 400 });
        }

        if (targetCardId === id) {
            return NextResponse.json({ error: "A card cannot depend on itself" }, { status: 400 });
        }

        // Verify target card exists
        const targetCard = await prisma.card.findUnique({
            where: { id: targetCardId },
            select: { id: true },
        });

        if (!targetCard) {
            return NextResponse.json({ error: "Target card not found" }, { status: 404 });
        }

        // Determine predecessor/successor based on direction
        // "blocking" = this card blocks targetCard (this = predecessor)
        // "blocked_by" = this card is blocked by targetCard (target = predecessor)
        const predecessorId = direction === "blocking" ? id : targetCardId;
        const successorId = direction === "blocking" ? targetCardId : id;

        // Check for existing dependency
        const existing = await prisma.cardDependency.findUnique({
            where: {
                predecessorId_successorId: { predecessorId, successorId },
            },
        });

        if (existing) {
            return NextResponse.json({ error: "Dependency already exists" }, { status: 409 });
        }

        // Also check reverse direction
        const reverseExisting = await prisma.cardDependency.findUnique({
            where: {
                predecessorId_successorId: {
                    predecessorId: successorId,
                    successorId: predecessorId,
                },
            },
        });

        if (reverseExisting) {
            return NextResponse.json({
                error: "A reverse dependency already exists between these cards",
            }, { status: 409 });
        }

        // Cycle detection for "blocks" type
        if (type === "blocks") {
            const hasCycle = await wouldCreateCycle(predecessorId, successorId);
            if (hasCycle) {
                return NextResponse.json({
                    error: "This dependency would create a circular blocking chain",
                }, { status: 400 });
            }
        }

        const dependency = await prisma.cardDependency.create({
            data: {
                type,
                predecessorId,
                successorId,
            },
            include: {
                predecessor: {
                    select: { id: true, title: true, status: true, priority: true, issueType: true, issueNumber: true },
                },
                successor: {
                    select: { id: true, title: true, status: true, priority: true, issueType: true, issueNumber: true },
                },
            },
        });

        // Fetch exact latest counts for both cards to broadcast to clients
        if (access.workspaceId) {
            const [sourceDependsOn, sourceDependedBy, targetDependsOn, targetDependedBy] = await Promise.all([
                prisma.cardDependency.count({ where: { predecessorId: id } }),
                prisma.cardDependency.count({ where: { successorId: id } }),
                prisma.cardDependency.count({ where: { predecessorId: targetCardId } }),
                prisma.cardDependency.count({ where: { successorId: targetCardId } })
            ]);

            emitToWorkspace(access.workspaceId, "card-dependency-updated", {
                workspaceId: access.workspaceId,
                cardId: id,
                dependencyCount: sourceDependsOn + sourceDependedBy,
                isBlocked: sourceDependedBy > 0,
                targetCardId,
                targetDependencyCount: targetDependsOn + targetDependedBy,
                targetIsBlocked: targetDependedBy > 0,
            });
        }

        return NextResponse.json(dependency, { status: 201 });
    } catch (error) {
        console.error("Error creating dependency:", error);
        return NextResponse.json({ error: "Failed to create dependency" }, { status: 500 });
    }
}
