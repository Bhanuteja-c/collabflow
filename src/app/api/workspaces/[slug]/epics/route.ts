// src/app/api/workspaces/[slug]/epics/route.ts
// CRUD for workspace Epics — list and create
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

// GET /api/workspaces/[slug]/epics — list epics with card counts
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        const { slug } = await params;
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = await ensureUser(session.user as any);
        const workspace = await resolveWorkspace(slug, userId);
        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
        }

        const epics = await prisma.epic.findMany({
            where: { workspaceId: workspace.id },
            include: {
                owner: { select: { id: true, name: true, image: true } },
                _count: { select: { cards: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        // Count completed cards per epic
        const epicsWithProgress = await Promise.all(
            epics.map(async (epic) => {
                const completedCount = await prisma.card.count({
                    where: {
                        epicId: epic.id,
                        status: { in: ["completed", "done"] },
                    },
                });
                return {
                    ...epic,
                    totalCards: epic._count.cards,
                    completedCards: completedCount,
                };
            })
        );

        return NextResponse.json(epicsWithProgress);
    } catch (error) {
        console.error("Error fetching epics:", error);
        return NextResponse.json({ error: "Failed to fetch epics" }, { status: 500 });
    }
}

// POST /api/workspaces/[slug]/epics — create an epic
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        const { slug } = await params;
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = await ensureUser(session.user as any);
        const workspace = await resolveWorkspace(slug, userId);
        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
        }

        const { title, description, color, targetDate } = await req.json();

        if (!title?.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const epic = await prisma.epic.create({
            data: {
                title: title.trim(),
                description: description || null,
                color: color || "#6366f1",
                targetDate: targetDate ? new Date(targetDate) : null,
                workspaceId: workspace.id,
                ownerId: userId,
            },
            include: {
                owner: { select: { id: true, name: true, image: true } },
                _count: { select: { cards: true } },
            },
        });

        return NextResponse.json({
            ...epic,
            totalCards: 0,
            completedCards: 0,
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating epic:", error);
        return NextResponse.json({ error: "Failed to create epic" }, { status: 500 });
    }
}
