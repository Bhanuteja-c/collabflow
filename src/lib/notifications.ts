// src/lib/notifications.ts
// Utility functions to create notifications
import { prisma } from "./prisma";
import { emitToUser } from "./socket";

export type NotificationType =
    | "workspace_invite"
    | "mention"
    | "task_assigned"
    | "document_shared"
    | "new_member"
    | "message";

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message?: string;
    link?: string;
    workspaceId?: string;
    senderId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
    try {
        // Don't notify yourself
        if (params.senderId && params.senderId === params.userId) {
            return null;
        }

        const notification = await prisma.notification.create({
            data: {
                userId: params.userId,
                type: params.type,
                title: params.title,
                message: params.message ?? null,
                link: params.link ?? null,
                workspaceId: params.workspaceId ?? null,
                senderId: params.senderId ?? null,
            },
        });

        // Enrich with sender data (no Prisma relation — resolved manually like the REST API does)
        let sender: { name: string; image: string | null } | null = null;
        if (params.senderId) {
            const senderUser = await prisma.user.findUnique({
                where: { id: params.senderId },
                select: { name: true, image: true },
            });
            if (senderUser) sender = { name: senderUser.name ?? "", image: senderUser.image };
        }

        // Push live to the user's personal socket room
        emitToUser(params.userId, "notification", { ...notification, sender });

        return notification;
    } catch (error) {
        console.error("Failed to create notification:", error);
        return null;
    }
}


// Helper to notify all workspace members
export async function notifyWorkspaceMembers(
    workspaceId: string,
    excludeUserId: string,
    type: NotificationType,
    title: string,
    message?: string,
    link?: string
) {
    try {
        const members = await prisma.workspaceMember.findMany({
            where: {
                workspaceId,
                userId: { not: excludeUserId }
            },
            select: { userId: true }
        });

        await Promise.all(
            members.map(member =>
                createNotification({
                    userId: member.userId,
                    type,
                    title,
                    message,
                    link,
                    workspaceId,
                    senderId: excludeUserId,
                })
            )
        );
    } catch (error) {
        console.error("Failed to notify workspace members:", error);
    }
}
