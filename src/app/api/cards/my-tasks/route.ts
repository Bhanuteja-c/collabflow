// src/app/api/cards/my-tasks/route.ts
// GET cards assigned to the current user in a workspace
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
        }

        // Verify membership
        const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (!membership) {
            return NextResponse.json({ error: "Not a member" }, { status: 403 });
        }

        // Get cards assigned to this user in this workspace
        const cards = await prisma.card.findMany({
            where: {
                assigneeId: userId,
                column: {
                    board: { workspaceId },
                },
            },
            include: {
                column: {
                    select: { id: true, title: true },
                },
                assignee: {
                    select: { id: true, name: true, image: true },
                },
            },
            orderBy: [
                { dueDate: { sort: "asc", nulls: "last" } },
                { priority: "desc" },
                { createdAt: "desc" },
            ],
            take: 20,
        });

        return NextResponse.json(cards);
    } catch (error) {
        console.error("[API/my-tasks] Error:", error);
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}
