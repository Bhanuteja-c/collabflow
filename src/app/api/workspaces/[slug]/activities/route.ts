// src/app/api/workspaces/[slug]/activities/route.ts
// GET workspace activity feed
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// GET /api/workspaces/[slug]/activities - Get recent activities
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

        // Find workspace and verify membership
        const workspace = await prisma.workspace.findUnique({
            where: { slug },
            include: {
                members: {
                    where: { userId },
                    select: { id: true }
                }
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        if (workspace.members.length === 0) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Parse query params
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
        const cursor = searchParams.get("cursor");

        // Fetch activities
        const activities = await prisma.activity.findMany({
            where: { workspaceId: workspace.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: limit + 1,
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1,
            }),
        });

        // Check if there's more
        let nextCursor: string | null = null;
        if (activities.length > limit) {
            const nextItem = activities.pop();
            nextCursor = nextItem!.id;
        }

        return NextResponse.json({
            activities,
            nextCursor,
        });
    } catch (error) {
        console.error("Error fetching activities:", error);
        return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
    }
}
