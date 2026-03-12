// src/app/api/cards/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// GET /api/cards/search?q=<query>&workspaceSlug=<slug>
// Returns cards matching the query by title or issue number
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || "";
        const workspaceSlug = searchParams.get("workspaceSlug") || "";

        if (!workspaceSlug) {
            return NextResponse.json({ error: "workspaceSlug is required" }, { status: 400 });
        }

        // Verify workspace membership
        const workspace = await prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
            include: {
                members: {
                    where: { userId },
                    select: { id: true },
                },
            },
        });

        if (!workspace || workspace.members.length === 0) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // Parse KAN-N pattern
        const kanMatch = query.match(/^(?:kan-?)?(\d+)$/i);
        const issueNumber = kanMatch ? parseInt(kanMatch[1], 10) : null;

        const cards = await prisma.card.findMany({
            where: {
                column: {
                    board: {
                        workspaceId: workspace.id,
                    },
                },
                OR: [
                    ...(query ? [{ title: { contains: query, mode: "insensitive" as const } }] : []),
                    ...(issueNumber !== null ? [{ issueNumber }] : []),
                ],
            },
            select: {
                id: true,
                title: true,
                issueNumber: true,
                column: {
                    select: {
                        title: true,
                    },
                },
            },
            take: 10,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(
            cards.map((card) => ({
                id: card.id,
                label: card.title,
                subtitle: card.issueNumber ? `KAN-${card.issueNumber}` : undefined,
                columnTitle: card.column?.title,
            }))
        );
    } catch (error) {
        console.error("Error searching cards:", error);
        return NextResponse.json({ error: "Failed to search cards" }, { status: 500 });
    }
}
