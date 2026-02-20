// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// GET /api/notifications - Get user's notifications
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });

        // Enqueue sender profiles
        const senderIds = Array.from(new Set(notifications.map(n => n.senderId).filter(Boolean))) as string[];
        const senders = await prisma.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, name: true, image: true }
        });

        const senderMap = new Map();
        senders.forEach(s => senderMap.set(s.id, s));

        const enrichedNotifications = notifications.map(n => ({
            ...n,
            sender: n.senderId ? senderMap.get(n.senderId) : null
        }));

        return NextResponse.json({ notifications: enrichedNotifications, unreadCount });
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
