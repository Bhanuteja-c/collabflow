import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = await ensureUser(session.user as any);
        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });
        return NextResponse.json({ unreadCount });
    } catch (error) {
        console.error("Get notifications count error:", error);
        return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
    }
}
