// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// GET /api/notifications - Get user's notifications
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const searchParams = req.nextUrl.searchParams;
        const filter = searchParams.get("filter") || "all";
        const cursor = searchParams.get("cursor");
        const take = parseInt(searchParams.get("take") || "20", 10);

        let baseWhere: any = { userId };
        if (filter === "unread") {
            baseWhere.isRead = false;
        } else if (filter === "mentions") {
            baseWhere.type = { in: ["mention", "message", "new_message"] };
        } else if (filter === "invites") {
            baseWhere.type = { in: ["workspace_invite", "new_member"] };
        }

        const notifications = await prisma.notification.findMany({
            where: baseWhere,
            take: take,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" },
        });

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });

        // Enqueue sender profiles
        const senderIds = Array.from(new Set(notifications.map((n: any) => n.senderId).filter(Boolean))) as string[];
        const senders = await prisma.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, name: true, image: true }
        });

        const senderMap = new Map();
        senders.forEach((s: any) => senderMap.set(s.id, s));

        const enrichedNotifications = notifications.map((n: any) => ({
            ...n,
            sender: n.senderId ? senderMap.get(n.senderId) : null
        }));

        const nextCursor = notifications.length === take ? notifications[take - 1].id : null;

        return NextResponse.json({ 
            notifications: enrichedNotifications, 
            nextCursor,
            unreadCount 
        });
    } catch (error) {
        console.error("Get notifications error:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

// POST /api/notifications - Mark notifications as read
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const body = await request.json();
        const { notificationIds, markAllRead } = body;

        if (markAllRead) {
            await prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true },
            });
        } else if (notificationIds && notificationIds.length > 0) {
            await prisma.notification.updateMany({
                where: {
                    id: { in: notificationIds },
                    userId, // Security: only update own notifications
                },
                data: { isRead: true },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update notifications error:", error);
        return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
    }
}
