// src/app/api/workspaces/[slug]/analytics/route.ts
// GET workspace analytics — task distribution, velocity, workload, time tracking
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

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

        // Support both id and slug lookup
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

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        if (workspace.members.length === 0) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get board for this workspace
        const board = await prisma.board.findFirst({
            where: { workspaceId: workspace.id },
            include: {
                columns: {
                    orderBy: { order: "asc" },
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        color: true,
                    },
                },
            },
        });

        if (!board) {
            return NextResponse.json({
                summary: { total: 0, completed: 0, inProgress: 0, totalPoints: 0, completedPoints: 0, totalTimeLogged: 0 },
                columnDistribution: [],
                priorityDistribution: [],
                issueTypeDistribution: [],
                velocity: [],
                memberWorkload: [],
                timeTracking: [],
            });
        }

        // Get all cards for this board (non-backlog)
        const cards = await prisma.card.findMany({
            where: { boardId: board.id, isBacklog: false },
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                issueType: true,
                storyPoints: true,
                columnId: true,
                assigneeId: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // Get all members of the workspace
        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId: workspace.id },
            include: {
                user: { select: { id: true, name: true, image: true } },
            },
        });

        // Get time logs for the board's cards
        const cardIds = cards.map((c) => c.id);
        const timeLogs = await prisma.timeLog.findMany({
            where: { cardId: { in: cardIds } },
            select: {
                duration: true,
                userId: true,
                createdAt: true,
            },
        });

        // --- Summary ---
        const completed = cards.filter((c) => c.status === "completed").length;
        const inProgress = cards.filter((c) => c.status === "active").length;
        const totalPoints = cards.reduce((sum, c) => sum + (c.storyPoints || 0), 0);
        const completedPoints = cards
            .filter((c) => c.status === "completed")
            .reduce((sum, c) => sum + (c.storyPoints || 0), 0);
        const totalTimeLogged = timeLogs.reduce((sum, t) => sum + t.duration, 0);

        // --- Column Distribution ---
        const columnDistribution = board.columns.map((col) => {
            const colCards = cards.filter((c) => c.columnId === col.id);
            return {
                columnId: col.id,
                title: col.title,
                category: col.category || "todo",
                color: col.color || "#6366f1",
                count: colCards.length,
                points: colCards.reduce((sum, c) => sum + (c.storyPoints || 0), 0),
            };
        });

        // --- Priority Distribution ---
        const priorities = ["high", "medium", "low"];
        const priorityDistribution = priorities.map((p) => ({
            priority: p,
            count: cards.filter((c) => c.priority === p).length,
        }));

        // --- Issue Type Distribution ---
        const issueTypes = ["task", "story", "bug", "feature"];
        const issueTypeDistribution = issueTypes.map((t) => ({
            type: t,
            count: cards.filter((c) => c.issueType === t).length,
        }));

        // --- Velocity: Story points completed per week (last 8 weeks) ---
        const now = new Date();
        const velocity: { week: string; points: number; completed: number }[] = [];
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const weekCards = cards.filter((c) => {
                const updated = new Date(c.updatedAt);
                return c.status === "completed" && updated >= weekStart && updated < weekEnd;
            });

            const label = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
            velocity.push({
                week: label,
                points: weekCards.reduce((sum, c) => sum + (c.storyPoints || 0), 0),
                completed: weekCards.length,
            });
        }

        // --- Member Workload ---
        const memberWorkload = members.map((m) => {
            const memberCards = cards.filter((c) => c.assigneeId === m.user.id);
            const memberTimeLogs = timeLogs.filter((t) => t.userId === m.user.id);
            return {
                userId: m.user.id,
                name: m.user.name || "Unknown",
                image: m.user.image,
                totalCards: memberCards.length,
                completedCards: memberCards.filter((c) => c.status === "completed").length,
                totalPoints: memberCards.reduce((sum, c) => sum + (c.storyPoints || 0), 0),
                timeLogged: memberTimeLogs.reduce((sum, t) => sum + t.duration, 0),
            };
        });

        // --- Time Tracking per week (last 8 weeks) ---
        const timeTracking: { week: string; minutes: number }[] = [];
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const weekLogs = timeLogs.filter((t) => {
                const d = new Date(t.createdAt);
                return d >= weekStart && d < weekEnd;
            });

            const label = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
            timeTracking.push({
                week: label,
                minutes: weekLogs.reduce((sum, t) => sum + t.duration, 0),
            });
        }

        return NextResponse.json({
            summary: {
                total: cards.length,
                completed,
                inProgress,
                totalPoints,
                completedPoints,
                totalTimeLogged,
            },
            columnDistribution,
            priorityDistribution,
            issueTypeDistribution,
            velocity,
            memberWorkload,
            timeTracking,
        });
    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
