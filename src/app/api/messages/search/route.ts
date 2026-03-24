import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// GET /api/messages/search - PostgreSQL Native Full-Text Search
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const searchParams = req.nextUrl.searchParams;
        const q = searchParams.get("q");
        const workspaceId = searchParams.get("workspaceId");
        const channelId = searchParams.get("channelId");
        const take = parseInt(searchParams.get("take") || "20", 10);

        if (!q || !workspaceId) {
            return NextResponse.json(
                { error: "Missing required parameters: q, workspaceId" },
                { status: 400 }
            );
        }

        // Validate workspace membership
        const member = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });

        if (!member) {
            return NextResponse.json({ error: "Forbidden: Not a member" }, { status: 403 });
        }

        // Native PostgreSQL FTS query
        // TODO: Add GIN index on Message.content in schema.prisma 
        // for production performance at scale 
        // @@index([content], type: Gin)
        const results = await prisma.$queryRaw`
            SELECT
                m.id,
                m.content,
                m."createdAt",
                m."channelId",
                c.name as "channelName",
                u.name as "authorName",
                u.image as "authorImage"
            FROM "Message" m
            JOIN "User" u ON u.id = m."authorId"
            JOIN "Channel" c ON c.id = m."channelId"
            WHERE
                m."isDeleted" = false
                AND m."parentId" IS NULL
                AND c."workspaceId" = ${workspaceId}
                AND (${channelId}::text IS NULL OR m."channelId" = ${channelId})
                AND to_tsvector('english', m.content) @@ plainto_tsquery('english', ${q})
            ORDER BY m."createdAt" DESC
            LIMIT ${take}
        `;

        return NextResponse.json({
            results,
            query: q,
            total: Array.isArray(results) ? results.length : 0,
        });

    } catch (error) {
        console.error("[API/messages/search] Error:", error);
        return NextResponse.json(
            { error: "Failed to search messages" },
            { status: 500 }
        );
    }
}
