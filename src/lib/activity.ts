// src/lib/activity.ts
// Utility for logging team activities to the Activity Feed

import { prisma } from "@/lib/prisma";

export type ActivityType =
    | "card_created"
    | "card_moved"
    | "card_completed"
    | "card_assigned"
    | "card_updated"
    | "document_created"
    | "document_edited"
    | "member_joined"
    | "member_left"
    | "channel_created"
    | "message_sent"
    | "board_created";

interface LogActivityParams {
    userId: string;
    workspaceId: string;
    type: ActivityType;
    action: string;
    entityType?: "card" | "document" | "channel" | "board" | "member";
    entityId?: string;
    entityTitle?: string;
    metadata?: Record<string, any>;
}

/**
 * Log an activity to the workspace feed
 * This is fire-and-forget - errors are logged but don't block the main operation
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
    try {
        await prisma.activity.create({
            data: {
                userId: params.userId,
                workspaceId: params.workspaceId,
                type: params.type,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                entityTitle: params.entityTitle,
                metadata: params.metadata,
            },
        });
    } catch (error) {
        // Log error but don't throw - activity logging should never block main operations
        console.error("[Activity] Failed to log activity:", error);
    }
}

/**
 * Helper functions for common activity types
 */
export const Activity = {
    async cardCreated(userId: string, workspaceId: string, cardId: string, cardTitle: string) {
        await logActivity({
            userId,
            workspaceId,
            type: "card_created",
            action: `created card "${cardTitle}"`,
            entityType: "card",
            entityId: cardId,
            entityTitle: cardTitle,
        });
    },

    async cardMoved(
        userId: string,
        workspaceId: string,
        cardId: string,
        cardTitle: string,
        fromColumn: string,
        toColumn: string
    ) {
        await logActivity({
            userId,
            workspaceId,
            type: "card_moved",
            action: `moved "${cardTitle}" from ${fromColumn} to ${toColumn}`,
            entityType: "card",
            entityId: cardId,
            entityTitle: cardTitle,
            metadata: { fromColumn, toColumn },
        });
    },

    async cardCompleted(userId: string, workspaceId: string, cardId: string, cardTitle: string) {
        await logActivity({
            userId,
            workspaceId,
            type: "card_completed",
            action: `completed "${cardTitle}"`,
            entityType: "card",
            entityId: cardId,
            entityTitle: cardTitle,
        });
    },

    async cardAssigned(
        userId: string,
        workspaceId: string,
        cardId: string,
        cardTitle: string,
        assigneeName: string
    ) {
        await logActivity({
            userId,
            workspaceId,
            type: "card_assigned",
            action: `assigned "${cardTitle}" to ${assigneeName}`,
            entityType: "card",
            entityId: cardId,
            entityTitle: cardTitle,
            metadata: { assigneeName },
        });
    },

    async documentCreated(userId: string, workspaceId: string, docId: string, docTitle: string) {
        await logActivity({
            userId,
            workspaceId,
            type: "document_created",
            action: `created document "${docTitle}"`,
            entityType: "document",
            entityId: docId,
            entityTitle: docTitle,
        });
    },

    async documentEdited(userId: string, workspaceId: string, docId: string, docTitle: string) {
        await logActivity({
            userId,
            workspaceId,
            type: "document_edited",
            action: `edited document "${docTitle}"`,
            entityType: "document",
            entityId: docId,
            entityTitle: docTitle,
        });
    },

    async memberJoined(userId: string, workspaceId: string, memberName: string) {
        await logActivity({
            userId,
            workspaceId,
            type: "member_joined",
            action: `${memberName} joined the workspace`,
            entityType: "member",
            entityId: userId,
            entityTitle: memberName,
        });
    },

    async boardCreated(userId: string, workspaceId: string, boardId: string, boardTitle: string) {
        await logActivity({
            userId,
            workspaceId,
            type: "board_created",
            action: `created board "${boardTitle}"`,
            entityType: "board",
            entityId: boardId,
            entityTitle: boardTitle,
        });
    },

    async channelCreated(userId: string, workspaceId: string, channelId: string, channelName: string) {
        await logActivity({
            userId,
            workspaceId,
            type: "channel_created",
            action: `created channel #${channelName}`,
            entityType: "channel",
            entityId: channelId,
            entityTitle: channelName,
        });
    },
};
