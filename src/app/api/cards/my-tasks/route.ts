// src/app/api/cards/my-tasks/route.ts
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
        const searchParams = req.nextUrl.searchParams;
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const doneColumnNames = ["done", "complete", "completed", "finished", "closed"];

        // --- Active tasks (not in done columns) ---
        const activeTasks = await prisma.card.findMany({
            where: {
                assigneeId: userId,
                column: {
                    board: { workspaceId },
                    AND: doneColumnNames.map(name => ({
                        NOT: { title: { equals: name, mode: "insensitive" as const } }
                    }))
                }
            },
            include: {
                column: { select: { id: true, title: true } },
                assignee: { select: { id: true, name: true, image: true } },
                epic: { select: { id: true, title: true, color: true } },
            },
            orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
            take: 20
        });

        // --- Completed tasks (in done columns, recent 10) ---
        const completedTasks = await prisma.card.findMany({
            where: {
                assigneeId: userId,
                column: {
                    board: { workspaceId },
                    OR: doneColumnNames.map(name => ({
                        title: { equals: name, mode: "insensitive" as const }
                    }))
                }
            },
            include: {
                column: { select: { id: true, title: true } },
                assignee: { select: { id: true, name: true, image: true } },
                epic: { select: { id: true, title: true, color: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: 10
        });

        // --- Epic progress for user's tasks ---
        const allUserCards = await prisma.card.findMany({
            where: {
                assigneeId: userId,
                column: { board: { workspaceId } },
                epicId: { not: null },
            },
            select: {
                epicId: true,
                column: { select: { title: true } },
                epic: { select: { id: true, title: true, color: true } },
            },
        });

        // Aggregate epic progress
        const epicMap = new Map<string, { id: string; title: string; color: string; total: number; completed: number }>();
        for (const card of allUserCards) {
            if (!card.epicId || !card.epic || !card.column) continue;
            const existing = epicMap.get(card.epicId);
            const isDone = doneColumnNames.includes(card.column.title.toLowerCase().trim());
            if (existing) {
                existing.total += 1;
                if (isDone) existing.completed += 1;
            } else {
                epicMap.set(card.epicId, {
                    id: card.epic.id,
                    title: card.epic.title,
                    color: card.epic.color,
                    total: 1,
                    completed: isDone ? 1 : 0,
                });
            }
        }
        const epicProgress = Array.from(epicMap.values());

        // --- Overdue count ---
        const now = new Date();
        const overdueCount = activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < now).length;

        // Sort: dated tasks first (soonest), then undated
        const sortedActive = activeTasks.sort((a, b) => {
            if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return 0;
        });

        return NextResponse.json({
            active: sortedActive,
            completed: completedTasks,
            epicProgress,
            stats: {
                totalActive: activeTasks.length,
                totalCompleted: completedTasks.length,
                overdue: overdueCount,
            }
        });
    } catch (error) {
        console.error("Error fetching my tasks:", error);
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}
