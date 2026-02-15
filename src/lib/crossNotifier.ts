// src/lib/crossNotifier.ts
// Posts formatted system messages to workspace chat channels when cross-feature events happen
import { prisma } from "@/lib/prisma";
import { emitToChannel } from "@/lib/socket";

// Find the "general" channel (or first public channel) for a workspace
async function getNotificationChannel(workspaceId: string) {
    // Try "general" channel first
    let channel = await prisma.channel.findFirst({
        where: { workspaceId, name: { equals: "general", mode: "insensitive" } },
    });
    // Fallback to first public channel
    if (!channel) {
        channel = await prisma.channel.findFirst({
            where: { workspaceId, type: "public" },
            orderBy: { createdAt: "asc" },
        });
    }
    return channel;
}

// Post a system-style message into a channel
async function postSystemMessage(channelId: string, authorId: string, content: string) {
    const message = await prisma.message.create({
        data: {
            content,
            channelId,
            authorId,
        },
        include: {
            author: { select: { id: true, name: true, image: true } },
            reactions: true,
        },
    });

    // Emit real-time so chat users see it immediately
    emitToChannel(channelId, "new-message", message);

    // Update channel timestamp
    await prisma.channel.update({
        where: { id: channelId },
        data: { updatedAt: new Date() },
    });

    return message;
}

export const CrossNotifier = {
    // Card completed (moved to a "Done" column)
    async cardCompleted(opts: {
        workspaceId: string;
        userId: string;
        cardTitle: string;
        boardName: string;
    }) {
        try {
            const channel = await getNotificationChannel(opts.workspaceId);
            if (!channel) return;
            await postSystemMessage(
                channel.id,
                opts.userId,
                `✅ Completed task **"${opts.cardTitle}"** on board *${opts.boardName}*`
            );
        } catch (e) {
            console.error("[CrossNotifier] cardCompleted error:", e);
        }
    },

    // Card assigned to someone
    async cardAssigned(opts: {
        workspaceId: string;
        userId: string;
        cardTitle: string;
        assigneeName: string;
    }) {
        try {
            const channel = await getNotificationChannel(opts.workspaceId);
            if (!channel) return;
            await postSystemMessage(
                channel.id,
                opts.userId,
                `📋 Assigned **"${opts.cardTitle}"** to **${opts.assigneeName}**`
            );
        } catch (e) {
            console.error("[CrossNotifier] cardAssigned error:", e);
        }
    },

    // New board created
    async boardCreated(opts: {
        workspaceId: string;
        userId: string;
        boardName: string;
    }) {
        try {
            const channel = await getNotificationChannel(opts.workspaceId);
            if (!channel) return;
            await postSystemMessage(
                channel.id,
                opts.userId,
                `📊 Created a new Kanban board: **"${opts.boardName}"**`
            );
        } catch (e) {
            console.error("[CrossNotifier] boardCreated error:", e);
        }
    },
};
