// src/socket/handlers/kanban.ts
// Kanban board events: join, leave, card CRUD, comments, checklist
import type { Server, Socket } from "socket.io";
import type { SocketData } from "../types";
import { makeRoomId, ROOM_PREFIX } from "../types";
import { prisma } from "../../lib/prisma";

export function registerKanbanHandlers(io: Server, socket: Socket<any, any, any, SocketData>) {
    socket.on("join-board", async (data: string | { boardId: string; user?: { id: string; name: string; image?: string } }) => {
        const boardId = typeof data === "string" ? data : data.boardId;
        const user = typeof data === "object" ? data.user : undefined;
        const userId = socket.data.userId;

        // SECURITY: Validate board access via workspace membership
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            select: {
                authorId: true,
                workspace: {
                    select: { members: { where: { userId }, select: { id: true } } },
                },
            },
        });

        if (!board) {
            socket.emit("error", { message: "Board not found", code: "NOT_FOUND" });
            return;
        }

        const isAuthor = board.authorId === userId;
        const isWorkspaceMember = (board.workspace?.members?.length ?? 0) > 0;

        if (!isAuthor && !isWorkspaceMember) {
            socket.emit("error", { message: "Not authorized for this board", code: "FORBIDDEN" });
            return;
        }

        const room = makeRoomId(ROOM_PREFIX.BOARD, boardId);
        socket.join(room);

        // If user info provided, notify others and send existing viewers
        if (user) {
            socket.to(room).emit("board-viewer-joined", { socketId: socket.id, user });

            const roomSockets = io.sockets.adapter.rooms.get(room);
            if (roomSockets) {
                const existingViewers: any[] = [];
                for (const socketId of roomSockets) {
                    if (socketId === socket.id) continue;
                    const s = io.sockets.sockets.get(socketId);
                    if (s) {
                        existingViewers.push({
                            socketId,
                            user: { id: s.data.userId, name: s.data.userName, image: s.data.userImage },
                        });
                    }
                }
                socket.emit("board-viewers", existingViewers);
            }
        }
    });

    socket.on("leave-board", (boardId: string) => {
        const room = makeRoomId(ROOM_PREFIX.BOARD, boardId);
        socket.leave(room);
        socket.to(room).emit("board-viewer-left", { socketId: socket.id });
    });

    // Card moved between columns
    socket.on("card-moved", (data: { boardId: string; cardId: string; fromColumnId: string; toColumnId: string; newOrder: number; orderKey?: string }) => {
        socket.to(makeRoomId(ROOM_PREFIX.BOARD, data.boardId)).emit("card-moved", data);
    });

    // Card CRUD
    socket.on("card-created", (data: { boardId: string; columnId: string; card: any }) => {
        socket.to(makeRoomId(ROOM_PREFIX.BOARD, data.boardId)).emit("card-created", data);
    });

    socket.on("card-updated", (data: { boardId: string; cardId: string; updates: any }) => {
        socket.to(makeRoomId(ROOM_PREFIX.BOARD, data.boardId)).emit("card-updated", data);
    });

    socket.on("card-deleted", (data: { boardId: string; cardId: string }) => {
        socket.to(makeRoomId(ROOM_PREFIX.BOARD, data.boardId)).emit("card-deleted", data);
    });

    // Comments
    socket.on("card-comment-added", (data: { boardId: string; cardId: string; comment: any }) => {
        socket.to(makeRoomId(ROOM_PREFIX.BOARD, data.boardId)).emit("card-comment-added", data);
    });

    socket.on("card-comment-deleted", (data: { boardId: string; cardId: string; commentId: string }) => {
        socket.to(makeRoomId(ROOM_PREFIX.BOARD, data.boardId)).emit("card-comment-deleted", data);
    });

    // Checklist
    socket.on("checklist-item-toggled", (data: { boardId: string; cardId: string; itemId: string; completed: boolean }) => {
        socket.to(makeRoomId(ROOM_PREFIX.BOARD, data.boardId)).emit("checklist-item-toggled", data);
    });

    // Backlog
    socket.on("backlog-updated", (data: { boardId: string; action: string; card?: any; cardId?: string }) => {
        socket.to(makeRoomId(ROOM_PREFIX.BOARD, data.boardId)).emit("backlog-updated", data);
    });

    // Subtasks
    socket.on("subtask-updated", (data: { boardId: string; parentCardId: string; action: string; subtask?: any; subtaskId?: string }) => {
        socket.to(makeRoomId(ROOM_PREFIX.BOARD, data.boardId)).emit("subtask-updated", data);
    });
}
