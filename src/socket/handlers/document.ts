// src/socket/handlers/document.ts
// Document collaboration: join, leave, Yjs sync, awareness
import type { Server, Socket } from "socket.io";
import type { SocketData } from "../types";
import { makeRoomId, ROOM_PREFIX } from "../types";
import { prisma } from "../../lib/prisma";

export function registerDocumentHandlers(io: Server, socket: Socket<any, any, any, SocketData>) {
    socket.on("join-document", async (data: { documentId: string; user: { id: string; name: string; color: string; image?: string } }) => {
        const userId = socket.data.userId;

        // SECURITY: Validate document access via workspace membership or ownership
        const document = await prisma.document.findUnique({
            where: { id: data.documentId },
            select: {
                authorId: true,
                isPublic: true,
                shares: { where: { userId }, select: { id: true } },
                workspace: {
                    select: { members: { where: { userId }, select: { id: true } } },
                },
            },
        });

        if (!document) {
            socket.emit("error", { message: "Document not found", code: "NOT_FOUND" });
            return;
        }

        const isAuthor = document.authorId === userId;
        const isPublic = document.isPublic;
        const hasShareAccess = document.shares.length > 0;
        const isWorkspaceMember = (document.workspace?.members?.length ?? 0) > 0;

        if (!isAuthor && !isPublic && !hasShareAccess && !isWorkspaceMember) {
            socket.emit("error", { message: "Not authorized for this document", code: "FORBIDDEN" });
            return;
        }

        const room = makeRoomId(ROOM_PREFIX.DOCUMENT, data.documentId);
        socket.join(room);

        // Notify others
        socket.to(room).emit("user-joined-doc", {
            socketId: socket.id,
            user: data.user,
        });

        // Send existing users to the new joiner
        const roomSockets = io.sockets.adapter.rooms.get(room);
        if (roomSockets) {
            const existingUsers: any[] = [];
            for (const socketId of roomSockets) {
                if (socketId === socket.id) continue;
                const s = io.sockets.sockets.get(socketId);
                if (s) {
                    existingUsers.push({
                        socketId,
                        user: { id: s.data.userId, name: s.data.userName, image: s.data.userImage },
                    });
                }
            }
            socket.emit("existing-doc-users", existingUsers);
        }

        // Send stored Yjs state to late joiners (Task 5 integration)
        try {
            const doc = await prisma.document.findUnique({
                where: { id: data.documentId },
                select: { yjsState: true },
            });
            if (doc?.yjsState) {
                socket.emit("doc-initial-state", {
                    state: Array.from(new Uint8Array(doc.yjsState)),
                });
            }
        } catch {
            // yjsState column may not exist yet before migration
        }
    });

    socket.on("leave-document", (documentId: string) => {
        const room = makeRoomId(ROOM_PREFIX.DOCUMENT, documentId);
        socket.leave(room);
        socket.to(room).emit("user-left-doc", { socketId: socket.id });
    });

    // Cursor position update
    socket.on("cursor-update", (data: { documentId: string; cursor: { from: number; to: number } }) => {
        socket.to(makeRoomId(ROOM_PREFIX.DOCUMENT, data.documentId)).emit("cursor-update", {
            socketId: socket.id,
            user: { id: socket.data.userId, name: socket.data.userName, image: socket.data.userImage },
            cursor: data.cursor,
        });
    });

    // Yjs document update relay
    socket.on("doc-update", (data: { documentId: string; update: ArrayBuffer | number[] }) => {
        socket.to(makeRoomId(ROOM_PREFIX.DOCUMENT, data.documentId)).emit("doc-update", {
            update: data.update,
        });
    });

    // Awareness update relay (user presence in document)
    socket.on("awareness-update", (data: { documentId: string; awareness?: any; update?: any }) => {
        socket.to(makeRoomId(ROOM_PREFIX.DOCUMENT, data.documentId)).emit("awareness-update", {
            socketId: socket.id,
            awareness: data.awareness,
            update: data.update,
        });
    });

    // Yjs state persistence — client sends full state for saving
    socket.on("doc-save", async (data: { documentId: string; state: number[]; html: string }) => {
        try {
            await prisma.document.update({
                where: { id: data.documentId },
                data: {
                    content: data.html,
                    yjsState: Buffer.from(new Uint8Array(data.state)),
                },
            });
        } catch (error) {
            console.error("[Socket.io] doc-save error:", error);
        }
    });
}
