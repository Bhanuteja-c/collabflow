// src/app/api/messages/[id]/route.ts
// Edit and delete individual messages
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { emitToChannel } from "@/lib/socket";

// PUT /api/messages/[id] - Edit a message (own messages only)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const { id } = await params;
        const { content } = await req.json();

        if (!content?.trim()) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        // Find message and verify ownership
        const message = await prisma.message.findUnique({
            where: { id },
            include: { channel: true },
        });

        if (!message) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        if (message.authorId !== userId) {
            return NextResponse.json({ error: "Can only edit own messages" }, { status: 403 });
        }

        if (message.isDeleted) {
            return NextResponse.json({ error: "Cannot edit deleted message" }, { status: 400 });
        }

        // Update message
        const updatedMessage = await prisma.message.update({
            where: { id },
            data: {
                content: content.trim(),
                isEdited: true,
                editedAt: new Date(),
            },
            include: {
                author: { select: { id: true, name: true, image: true } },
                reactions: true,
            },
        });

        // Emit socket event for real-time update
        emitToChannel(message.channelId, "message-edited", {
            messageId: id,
            content: updatedMessage.content,
            isEdited: true,
            editedAt: updatedMessage.editedAt,
        });

        return NextResponse.json(updatedMessage);
    } catch (error) {
        console.error("[API/messages/[id]] PUT Error:", error);
        return NextResponse.json({
            error: "Failed to edit message",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}

// DELETE /api/messages/[id] - Soft delete a message (own messages only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const { id } = await params;

        // Find message and verify ownership
        const message = await prisma.message.findUnique({
            where: { id },
        });

        if (!message) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        if (message.authorId !== userId) {
            return NextResponse.json({ error: "Can only delete own messages" }, { status: 403 });
        }

        if (message.isDeleted) {
            return NextResponse.json({ error: "Message already deleted" }, { status: 400 });
        }

        // Soft delete - keep message shell but clear content
        await prisma.message.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                content: "[This message was deleted]",
            },
        });

        // Emit socket event for real-time update
        emitToChannel(message.channelId, "message-deleted", {
            messageId: id,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[API/messages/[id]] DELETE Error:", error);
        return NextResponse.json({
            error: "Failed to delete message",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
