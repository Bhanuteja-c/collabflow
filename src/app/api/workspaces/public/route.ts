// src/app/api/workspaces/public/route.ts
// GET public workspaces for discovery
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/workspaces/public - List public workspaces for discovery
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
        const cursor = searchParams.get("cursor");

        // Find public workspaces
        const workspaces = await prisma.workspace.findMany({
            where: {
                isPublic: true,
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { description: { contains: search, mode: "insensitive" } },
                    ],
                }),
            },
            include: {
                owner: {
                    select: { id: true, name: true, image: true }
                },
                _count: {
                    select: { members: true, documents: true, boards: true }
                },
                // Check if current user is already a member
                ...(userId && {
                    members: {
                        where: { userId },
                        select: { id: true, role: true }
                    }
                }),
            },
            orderBy: [
                { members: { _count: "desc" } }, // Popular first
                { createdAt: "desc" },
            ],
            take: limit + 1,
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1,
            }),
        });

        // Check if there's more
        let nextCursor: string | null = null;
        if (workspaces.length > limit) {
            const nextItem = workspaces.pop();
            nextCursor = nextItem!.id;
        }

        // Transform response
        const result = workspaces.map(ws => ({
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            description: ws.description,
            image: ws.image,
            owner: ws.owner,
            memberCount: ws._count.members,
            documentCount: ws._count.documents,
            boardCount: ws._count.boards,
            isMember: userId ? (ws as any).members?.length > 0 : false,
            memberRole: userId ? (ws as any).members?.[0]?.role : null,
            createdAt: ws.createdAt,
        }));

        return NextResponse.json({
            workspaces: result,
            nextCursor,
        });
    } catch (error) {
        console.error("Error fetching public workspaces:", error);
        return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
    }
}
