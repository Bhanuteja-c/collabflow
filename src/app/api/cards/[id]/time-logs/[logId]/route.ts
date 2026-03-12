// src/app/api/cards/[id]/time-logs/[logId]/route.ts
// DELETE a specific time log entry
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { checkCardWorkspaceAccess } from "@/lib/workspaceAccess";

// DELETE - Remove a time log entry (only the author or workspace admin can delete)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; logId: string }> }
) {
    try {
        const session = await auth();
        const { id, logId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Check workspace access
        const card = await checkCardWorkspaceAccess(id, userId);
        if (!card) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        // Find the time log
        const timeLog = await prisma.timeLog.findUnique({
            where: { id: logId },
        });

        if (!timeLog) {
            return NextResponse.json({ error: "Time log not found" }, { status: 404 });
        }

        // Ensure the time log belongs to this card
        if (timeLog.cardId !== id) {
            return NextResponse.json({ error: "Time log does not belong to this card" }, { status: 400 });
        }

        // Only allow the author to delete their own time log
        if (timeLog.userId !== userId) {
            return NextResponse.json({ error: "You can only delete your own time logs" }, { status: 403 });
        }

        await prisma.timeLog.delete({
            where: { id: logId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting time log:", error);
        return NextResponse.json({ error: "Failed to delete time log" }, { status: 500 });
    }
}
