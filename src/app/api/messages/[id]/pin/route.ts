// POST /api/messages/[id]/pin — Toggle pin status for a message
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = await ensureUser(session.user as any);

    try {
        // Find the message and verify channel membership
        const message = await prisma.message.findUnique({
            where: { id },
            include: {
                channel: {
                    include: {
                        members: { where: { userId }, select: { id: true } },
                    },
                },
            },
        });

        if (!message) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        if (message.channel.members.length === 0) {
            return NextResponse.json({ error: "Not a channel member" }, { status: 403 });
        }

        // Toggle pin
        // Check if already pinned
        const existingPin = await prisma.pinnedMessage.findUnique({
            where: { messageId: id },
        });

        const isPinned = !existingPin; // Determine the target state (true for pin, false for unpin)

        if (isPinned) {
            if (!existingPin) { // If it should be pinned and isn't already
                await prisma.pinnedMessage.create({
                    data: {
                        messageId: id,
                        pinnedBy: userId,
                    },
                });
            }
        } else { // If it should be unpinned
            if (existingPin) { // If it should be unpinned and is currently pinned
                await prisma.pinnedMessage.delete({
                     where: { messageId: id }
                });
            }
        }

        return NextResponse.json({ success: true, isPinned });
    } catch (error) {
        console.error("Pin toggle error:", error);
        return NextResponse.json({ error: "Failed to toggle pin" }, { status: 500 });
    }
}
