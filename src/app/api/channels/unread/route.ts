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
        const url = new URL(req.url);
        const workspaceId = url.searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
        }

        const unreadData: any[] = await prisma.$queryRaw`
            SELECT 
                c.id, 
                c.name, 
                c."type",
                CAST(COUNT(m.id) AS INTEGER) as "unreadCount",
                ou.id as "otherUserId",
                ou.name as "otherUserName",
                ou.image as "otherUserImage"
            FROM "Channel" c
            JOIN "ChannelMember" cm ON cm."channelId" = c.id
            LEFT JOIN "ChannelMember" om ON om."channelId" = c.id AND om."userId" != ${userId} AND c."type" IN ('direct', 'DIRECT')
            LEFT JOIN "User" ou ON ou.id = om."userId"
            LEFT JOIN "Message" m ON m."channelId" = c.id 
                AND (cm."lastReadAt" IS NULL OR m."createdAt" > cm."lastReadAt")
                AND m."isDeleted" = false
                AND m."authorId" != ${userId}
            WHERE 
                c."workspaceId" = ${workspaceId}
                AND cm."userId" = ${userId}
            GROUP BY 
                c.id, c.name, c."type", ou.id, ou.name, ou.image
            HAVING COUNT(m.id) > 0 OR c."type" IN ('direct', 'DIRECT')
            ORDER BY MAX(m."createdAt") DESC NULLS LAST
            LIMIT 50
        `;

        let totalUnread = 0;
        let dmUnread = 0;
        const channels = unreadData.map(row => {
            const count = row.unreadCount || 0;
            const isDirect = row.type === 'direct' || row.type === 'DIRECT';
            totalUnread += count;
            if (isDirect) dmUnread += count;
            return {
                id: row.id,
                name: row.name,
                type: row.type,
                unreadCount: count,
                ...(isDirect && {
                    otherUser: {
                        id: row.otherUserId || "deleted",
                        name: row.otherUserName || "Deleted User",
                        image: row.otherUserImage || null
                    }
                })
            };
        });

        return NextResponse.json({
            channels,
            totalUnread,
            dmUnread
        });
    } catch (error) {
        console.error("Error fetching unread channels:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
