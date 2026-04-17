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

        const searchParams = req.nextUrl.searchParams;
        const dateStartStr = searchParams.get("dateStart");
        const dateEndStr = searchParams.get("dateEnd");
        
        let dateStart = new Date();
        dateStart.setDate(dateStart.getDate() - 30);
        let dateEnd = new Date();

        if (dateStartStr) dateStart = new Date(dateStartStr);
        if (dateEndStr) {
            dateEnd = new Date(dateEndStr);
            dateEnd.setHours(23, 59, 59, 999);
        }

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

        // Get ALL boards for this workspace
        const boards = await prisma.board.findMany({
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

        if (boards.length === 0) {
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

        const boardIds = boards.map((b) => b.id);
        const allColumns = boards.flatMap((b) => b.columns);

        // Get all cards across ALL boards (no date filter — summary must show current state)
        const cards = await prisma.card.findMany({
            where: { 
                boardId: { in: boardIds }, 
                isBacklog: false,
            },
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

        // Get time logs for all cards (date-filtered for period metrics)
        const cardIds = cards.map((c) => c.id);
        const timeLogs = await prisma.timeLog.findMany({
            where: { 
                cardId: { in: cardIds },
                createdAt: {
                    gte: dateStart,
                    lte: dateEnd
                }
            },
            select: {
                duration: true,
                userId: true,
                createdAt: true,
            },
        });

        // --- Summary (current state — no date filter) ---
        const completed = cards.filter((c) => c.status === "completed").length;
        const inProgress = cards.filter((c) => c.status === "active").length;
        const totalPoints = cards.reduce((sum, c) => sum + (c.storyPoints || 0), 0);
        const completedPoints = cards
            .filter((c) => c.status === "completed")
            .reduce((sum, c) => sum + (c.storyPoints || 0), 0);
        const totalTimeLogged = timeLogs.reduce((sum, t) => sum + t.duration, 0);


        // --- Column Distribution (merged by name across all boards) ---
        const columnMap = new Map<string, { title: string; category: string; color: string; count: number; points: number }>();
        for (const col of allColumns) {
            const key = col.title.toLowerCase().trim();
            const colCards = cards.filter((c) => c.columnId === col.id);
            const cardCount = colCards.length;
            const cardPoints = colCards.reduce((sum, c) => sum + (c.storyPoints || 0), 0);
            const existing = columnMap.get(key);
            if (existing) {
                existing.count += cardCount;
                existing.points += cardPoints;
            } else {
                columnMap.set(key, {
                    title: col.title,
                    category: (col as any).category || "todo",
                    color: col.color || "#6366f1",
                    count: cardCount,
                    points: cardPoints,
                });
            }
        }
        const columnDistribution = Array.from(columnMap.values());


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
        const now = dateEnd;
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
