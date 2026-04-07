// src/app/api/workspaces/[slug]/files/route.ts
// List, search, and filter workspace files
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { slug } = await params;
        const userId = session.user.id;

        // Find workspace and verify membership
        const workspace = await prisma.workspace.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
        });

        if (!membership) {
            return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });
        }

        // Parse query params
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category") || "all";
        const source = searchParams.get("source") || "all";
        const search = searchParams.get("search") || "";
        const sort = searchParams.get("sort") || "newest";
        const cursor = searchParams.get("cursor") || undefined;
        const take = Math.min(parseInt(searchParams.get("take") || "20", 10), 50);

        // Build where clause
        const where: any = { workspaceId: workspace.id };

        if (category !== "all") {
            where.category = category;
        }
        if (source !== "all") {
            where.sourceType = source;
        }
        if (search) {
            where.originalName = { contains: search, mode: "insensitive" };
        }

        // Sort mapping
        const orderByMap: Record<string, any> = {
            newest: { createdAt: "desc" },
            oldest: { createdAt: "asc" },
            largest: { size: "desc" },
            smallest: { size: "asc" },
            name: { originalName: "asc" },
        };
        const orderBy = orderByMap[sort] || orderByMap.newest;

        // Fetch files (take + 1 to check for next page)
        const files = await prisma.file.findMany({
            where,
            include: {
                uploadedBy: {
                    select: { id: true, name: true, image: true },
                },
            },
            orderBy,
            take: take + 1,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });

        const hasMore = files.length > take;
        const results = hasMore ? files.slice(0, take) : files;
        const nextCursor = hasMore ? results[results.length - 1].id : null;

        // Storage stats
        const stats = await prisma.file.aggregate({
            where: { workspaceId: workspace.id },
            _sum: { size: true },
            _count: { id: true },
        });

        // Category counts for filter badges
        const categoryCounts = await prisma.file.groupBy({
            by: ["category"],
            where: { workspaceId: workspace.id },
            _count: { id: true },
        });

        return NextResponse.json({
            files: results,
            nextCursor,
            stats: {
                totalFiles: stats._count.id,
                totalSize: stats._sum.size ?? 0,
            },
            categoryCounts: categoryCounts.reduce(
                (acc: Record<string, number>, c: { category: string; _count: { id: number } }) => ({ ...acc, [c.category]: c._count.id }),
                {} as Record<string, number>
            ),
        });
    } catch (error) {
        console.error("[API/files] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch files" },
            { status: 500 }
        );
    }
}
