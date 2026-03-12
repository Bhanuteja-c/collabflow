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

        // Fetch cards assigned to the current user in this workspace
        // Exclude cards in columns that are considered "Done"
        const doneColumnNames = ["done", "complete", "completed", "finished", "closed"];

        const tasks = await prisma.card.findMany({
            where: {
                assigneeId: userId,
                // The card must belong to a column that belongs to a board in this workspace
                column: {
                    board: {
                        workspaceId: workspaceId
                    },
                    // Optimization: Filter out completed tasks so the dashboard only shows "Active" tasks
                    title: {
                        notIn: doneColumnNames,
                        mode: "insensitive"
                    }
                }
            },
            include: {
                column: {
                    select: {
                        id: true,
                        title: true,
                    }
                },
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                }
            },
            orderBy: [
                { dueDate: 'asc' },   // Due soonest first
                { priority: 'desc' }  // Highest priority first (if dates are equal, or no dates)
            ],
            take: 10 // Limit to top 10 most urgent tasks for the dashboard
        });

        // The exact UI needs an array, but if dates are null, Prisma sorts them first in ASC.
        // Let's manually sort so that cards WITHOUT due dates go to the bottom.
        const sortedTasks = tasks.sort((a, b) => {
            if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return 0; // fallback to DB priority sorting
        });

        return NextResponse.json(sortedTasks);
    } catch (error) {
        console.error("Error fetching my tasks:", error);
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}
