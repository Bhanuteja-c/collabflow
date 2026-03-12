// src/app/api/workspaces/[slug]/epics/[id]/route.ts
// Epic detail, update, and delete
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// Helper: resolve workspace + verify membership
async function resolveWorkspace(slug: string, userId: string) {
    const isCuid = slug.length === 25 && /^[a-z0-9]+$/.test(slug);
    const workspace = await prisma.workspace.findFirst({
        where: isCuid ? { id: slug } : { slug },
        include: {
            members: {
                where: { userId },
                select: { id: true },
            },
        },
    });
    if (!workspace || workspace.members.length === 0) return null;
    return workspace;
}

// GET /api/workspaces/[slug]/epics/[id] — epic detail with linked cards
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const session = await auth();
        const { slug, id } = await params;
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = await ensureUser(session.user as any);
        const workspace = await resolveWorkspace(slug, userId);
        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
        }

        const epic = await prisma.epic.findUnique({
            where: { id },
            include: {
                owner: { select: { id: true, name: true, image: true } },
                cards: {
                    include: {
                        assignee: { select: { id: true, name: true, image: true } },
                    },
                    orderBy: { updatedAt: "desc" },
                },
            },
        });

        if (!epic || epic.workspaceId !== workspace.id) {
            return NextResponse.json({ error: "Epic not found" }, { status: 404 });
        }

        const completedCards = epic.cards.filter(
            (c) => c.status === "completed" || c.status === "done"
        ).length;

        return NextResponse.json({
            ...epic,
            totalCards: epic.cards.length,
            completedCards,
        });
    } catch (error) {
        console.error("Error fetching epic:", error);
        return NextResponse.json({ error: "Failed to fetch epic" }, { status: 500 });
    }
}

// PUT /api/workspaces/[slug]/epics/[id] — update an epic
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const session = await auth();
        const { slug, id } = await params;
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = await ensureUser(session.user as any);
        const workspace = await resolveWorkspace(slug, userId);
        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
        }

        // Verify epic belongs to this workspace
        const existing = await prisma.epic.findUnique({ where: { id } });
        if (!existing || existing.workspaceId !== workspace.id) {
            return NextResponse.json({ error: "Epic not found" }, { status: 404 });
        }

        const { title, description, color, status, targetDate } = await req.json();

        const epic = await prisma.epic.update({
            where: { id },
            data: {
                ...(title !== undefined && { title: title.trim() }),
                ...(description !== undefined && { description }),
                ...(color !== undefined && { color }),
                ...(status !== undefined && { status }),
                ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
            },
            include: {
                owner: { select: { id: true, name: true, image: true } },
                _count: { select: { cards: true } },
            },
        });

        return NextResponse.json(epic);
    } catch (error) {
        console.error("Error updating epic:", error);
        return NextResponse.json({ error: "Failed to update epic" }, { status: 500 });
    }
}

// DELETE /api/workspaces/[slug]/epics/[id] — delete an epic (unlinks cards)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const session = await auth();
        const { slug, id } = await params;
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = await ensureUser(session.user as any);
        const workspace = await resolveWorkspace(slug, userId);
        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
        }

        // Verify epic belongs to this workspace
        const existing = await prisma.epic.findUnique({ where: { id } });
        if (!existing || existing.workspaceId !== workspace.id) {
            return NextResponse.json({ error: "Epic not found" }, { status: 404 });
        }

        // Unlink all cards first (set epicId = null), then delete
        await prisma.card.updateMany({
            where: { epicId: id },
            data: { epicId: null },
        });

        await prisma.epic.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting epic:", error);
        return NextResponse.json({ error: "Failed to delete epic" }, { status: 500 });
    }
}
