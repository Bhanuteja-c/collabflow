// src/app/api/cards/[id]/github-activity/route.ts
// Returns GitHub-sourced activity records for a specific card
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: cardId } = await params;

        // Verify card exists and user has access
        const card = await prisma.card.findUnique({
            where: { id: cardId },
            select: {
                id: true,
                board: {
                    select: {
                        workspaceId: true,
                        workspace: {
                            select: {
                                members: {
                                    where: { userId: session.user.id },
                                    select: { id: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!card || !card.board?.workspace?.members?.length) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Fetch activities for this card
        const activities = await prisma.activity.findMany({
            where: {
                entityId: cardId,
                entityType: "card",
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        // Filter to GitHub-sourced activities
        const githubActivities = activities.filter(a => {
            try {
                const meta = a.metadata as Record<string, unknown>;
                return meta?.source === "github";
            } catch {
                return false;
            }
        });

        return NextResponse.json(githubActivities);
    } catch (error) {
        console.error("Error fetching GitHub activity:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
