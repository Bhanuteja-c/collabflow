// src/lib/workspaceAccess.ts
// Shared utilities for checking workspace membership across different resources

import { prisma } from "@/lib/prisma";

/**
 * Check if user has access to a card via workspace membership
 * Returns the card if access granted, null otherwise
 */
export async function checkCardWorkspaceAccess(cardId: string, userId: string) {
    const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
            column: {
                include: {
                    board: {
                        include: {
                            workspace: {
                                include: {
                                    members: {
                                        where: { userId },
                                        select: { id: true }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            board: {
                include: {
                    workspace: {
                        include: {
                            members: {
                                where: { userId },
                                select: { id: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!card) return null;

    // Resolve board from column path or direct board relation (backlog cards)
    const board = card.column?.board || card.board;
    if (!board) return null;

    const isAuthor = board.authorId === userId;
    const isWorkspaceMember = board.workspace?.members && board.workspace.members.length > 0;

    if (!isAuthor && !isWorkspaceMember) return null;

    return card;
}

/**
 * Check if user has access to a board via workspace membership
 */
export async function checkBoardWorkspaceAccess(boardId: string, userId: string) {
    const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
            workspace: {
                include: {
                    members: {
                        where: { userId },
                        select: { id: true }
                    }
                }
            }
        }
    });

    if (!board) return null;

    const isAuthor = board.authorId === userId;
    const isWorkspaceMember = board.workspace?.members && board.workspace.members.length > 0;

    if (!isAuthor && !isWorkspaceMember) return null;

    return board;
}

/**
 * Check if user has access to a document via workspace membership
 */
export async function checkDocumentWorkspaceAccess(documentId: string, userId: string) {
    const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
            shares: {
                where: { userId },
                select: { permission: true }
            },
            workspace: {
                include: {
                    members: {
                        where: { userId },
                        select: { id: true }
                    }
                }
            }
        }
    });

    if (!document) return null;

    const isAuthor = document.authorId === userId;
    const isPublic = document.isPublic;
    const hasShareAccess = document.shares.length > 0;
    const isWorkspaceMember = document.workspace?.members && document.workspace.members.length > 0;

    if (!isAuthor && !isPublic && !hasShareAccess && !isWorkspaceMember) return null;

    return {
        document,
        permission: isAuthor ? "owner" : (document.shares[0]?.permission === "edit" || isWorkspaceMember) ? "edit" : "view"
    };
}

/**
 * Check if user has access to a channel via workspace membership
 */
export async function checkChannelWorkspaceAccess(channelId: string, userId: string) {
    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: {
            members: {
                where: { userId },
                select: { id: true }
            },
            workspace: {
                include: {
                    members: {
                        where: { userId },
                        select: { id: true }
                    }
                }
            }
        }
    });

    if (!channel) return null;

    const isChannelMember = channel.members.length > 0;
    const isWorkspaceMember = channel.workspace?.members && channel.workspace.members.length > 0;

    if (!isChannelMember && !isWorkspaceMember) return null;

    return channel;
}
