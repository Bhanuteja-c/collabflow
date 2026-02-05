// server.ts - Custom server with Socket.io for real-time collaboration
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store the io instance globally for API routes to use
declare global {
    var io: SocketIOServer | undefined;
}

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.io with production-optimized settings
    const io = new SocketIOServer(httpServer, {
        path: "/api/socketio",
        cors: {
            origin: process.env.NEXTAUTH_URL || "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
        // Production optimizations for lower latency
        pingTimeout: 60000,        // How long to wait for pong
        pingInterval: 25000,       // How often to ping
        transports: ["websocket", "polling"],
        allowUpgrades: true,
        perMessageDeflate: false,  // Disable compression for lower latency
        httpCompression: false,    // Faster transmission
        maxHttpBufferSize: 1e6,    // 1MB max message size
    });

    // Store globally for API routes
    global.io = io;

    io.on("connection", (socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id}`);

        // ==================== CHAT CHANNEL EVENTS ====================

        // Join a channel room with presence tracking
        socket.on("join-channel", (data: string | { channelId: string; user?: { id: string; name: string; image?: string } }) => {
            // Support both old format (just channelId) and new format (object with user)
            const channelId = typeof data === "string" ? data : data.channelId;
            const user = typeof data === "object" ? data.user : undefined;

            socket.join(`channel:${channelId}`);
            console.log(`[Socket.io] ${user?.name || socket.id} joined channel:${channelId}`);

            // Store channel ID and user info on socket for cleanup
            (socket as any).currentChannelId = channelId;
            (socket as any).channelUser = user;

            // If user info provided, notify others and send existing online users
            if (user) {
                // Notify others of new user
                socket.to(`channel:${channelId}`).emit("channel-user-joined", {
                    socketId: socket.id,
                    user,
                });

                // Send existing online users to new joiner
                const room = io.sockets.adapter.rooms.get(`channel:${channelId}`);
                if (room) {
                    const onlineUsers: any[] = [];
                    room.forEach((socketId) => {
                        const s = io.sockets.sockets.get(socketId);
                        if (s && socketId !== socket.id && (s as any).channelUser) {
                            onlineUsers.push({
                                socketId,
                                user: (s as any).channelUser,
                            });
                        }
                    });
                    socket.emit("channel-presence", { users: onlineUsers });
                }
            }
        });

        // Leave a channel room
        socket.on("leave-channel", (channelId: string) => {
            socket.leave(`channel:${channelId}`);
            // Notify others this user left
            socket.to(`channel:${channelId}`).emit("channel-user-left", {
                socketId: socket.id,
            });
            (socket as any).currentChannelId = null;
            (socket as any).channelUser = null;
        });

        // Typing indicator
        socket.on("typing", (data: { channelId: string; userId: string; name: string }) => {
            socket.to(`channel:${data.channelId}`).emit("user-typing", {
                userId: data.userId,
                name: data.name,
            });
        });

        // Stop typing
        socket.on("stop-typing", (data: { channelId: string; userId: string }) => {
            socket.to(`channel:${data.channelId}`).emit("user-stop-typing", {
                userId: data.userId,
            });
        });

        // ==================== DOCUMENT COLLABORATION EVENTS ====================

        // Join a document room for real-time sync
        socket.on("join-document", (data: { documentId: string; user: { id: string; name: string; color: string; image?: string } }) => {
            socket.join(`doc:${data.documentId}`);
            (socket as any).docUser = data.user;
            (socket as any).currentDocId = data.documentId;
            console.log(`[Socket.io] ${data.user.name} joined doc:${data.documentId}`);

            // Notify others
            socket.to(`doc:${data.documentId}`).emit("user-joined-doc", {
                socketId: socket.id,
                user: data.user,
            });

            // Send list of existing users to the new joiner
            const room = io.sockets.adapter.rooms.get(`doc:${data.documentId}`);
            if (room) {
                const existingUsers: any[] = [];
                room.forEach((socketId) => {
                    const s = io.sockets.sockets.get(socketId);
                    if (s && socketId !== socket.id && (s as any).docUser) {
                        existingUsers.push({
                            socketId,
                            user: (s as any).docUser,
                        });
                    }
                });
                socket.emit("existing-doc-users", existingUsers);
            }
        });

        // Leave document
        socket.on("leave-document", (documentId: string) => {
            socket.leave(`doc:${documentId}`);
            socket.to(`doc:${documentId}`).emit("user-left-doc", {
                socketId: socket.id,
            });
            (socket as any).currentDocId = null;
        });

        // Cursor position update
        socket.on("cursor-update", (data: { documentId: string; cursor: { from: number; to: number } }) => {
            socket.to(`doc:${data.documentId}`).emit("cursor-update", {
                socketId: socket.id,
                user: (socket as any).docUser,
                cursor: data.cursor,
            });
        });

        // Document content update (Yjs sync) - using binary for efficiency
        socket.on("doc-update", (data: { documentId: string; update: ArrayBuffer }) => {
            socket.to(`doc:${data.documentId}`).emit("doc-update", {
                update: data.update,
            });
        });

        // Awareness update (user presence)
        socket.on("awareness-update", (data: { documentId: string; awareness: any }) => {
            socket.to(`doc:${data.documentId}`).emit("awareness-update", {
                socketId: socket.id,
                awareness: data.awareness,
            });
        });

        // ==================== KANBAN BOARD EVENTS ====================

        // Join kanban board room with user presence
        socket.on("join-board", (data: string | { boardId: string; user?: { id: string; name: string; image?: string } }) => {
            // Support both old format (just boardId string) and new format (object with user)
            const boardId = typeof data === "string" ? data : data.boardId;
            const user = typeof data === "object" ? data.user : undefined;

            socket.join(`board:${boardId}`);
            (socket as any).currentBoardId = boardId;
            (socket as any).boardUser = user;
            console.log(`[Socket.io] ${user?.name || socket.id} joined board:${boardId}`);

            // If user info provided, notify others and send existing viewers
            if (user) {
                // Notify others of new viewer
                socket.to(`board:${boardId}`).emit("board-viewer-joined", {
                    socketId: socket.id,
                    user,
                });

                // Send existing viewers to new joiner
                const room = io.sockets.adapter.rooms.get(`board:${boardId}`);
                if (room) {
                    const existingViewers: any[] = [];
                    room.forEach((socketId) => {
                        const s = io.sockets.sockets.get(socketId);
                        if (s && socketId !== socket.id && (s as any).boardUser) {
                            existingViewers.push({
                                socketId,
                                user: (s as any).boardUser,
                            });
                        }
                    });
                    socket.emit("board-viewers", existingViewers);
                }
            }
        });

        // Leave kanban board
        socket.on("leave-board", (boardId: string) => {
            socket.leave(`board:${boardId}`);
            // Notify others this viewer left
            socket.to(`board:${boardId}`).emit("board-viewer-left", {
                socketId: socket.id,
            });
            (socket as any).currentBoardId = null;
            (socket as any).boardUser = null;
        });

        // Card moved between columns
        socket.on("card-moved", (data: { boardId: string; cardId: string; fromColumnId: string; toColumnId: string; newOrder: number }) => {
            socket.to(`board:${data.boardId}`).emit("card-moved", data);
        });

        // Card created
        socket.on("card-created", (data: { boardId: string; columnId: string; card: any }) => {
            socket.to(`board:${data.boardId}`).emit("card-created", data);
        });

        // Card updated
        socket.on("card-updated", (data: { boardId: string; cardId: string; updates: any }) => {
            socket.to(`board:${data.boardId}`).emit("card-updated", data);
        });

        // Card deleted
        socket.on("card-deleted", (data: { boardId: string; cardId: string }) => {
            socket.to(`board:${data.boardId}`).emit("card-deleted", data);
        });

        // Card comment added (real-time)
        socket.on("card-comment-added", (data: { boardId: string; cardId: string; comment: any }) => {
            socket.to(`board:${data.boardId}`).emit("card-comment-added", data);
        });

        // Card comment deleted
        socket.on("card-comment-deleted", (data: { boardId: string; cardId: string; commentId: string }) => {
            socket.to(`board:${data.boardId}`).emit("card-comment-deleted", data);
        });

        // Checklist item toggled
        socket.on("checklist-item-toggled", (data: { boardId: string; cardId: string; itemId: string; completed: boolean }) => {
            socket.to(`board:${data.boardId}`).emit("checklist-item-toggled", data);
        });

        // ==================== VIDEO ROOM EVENTS ====================

        // Join a video room
        socket.on("join-room", (data: { roomId: string; userId: string; userName: string; userImage: string }) => {
            socket.join(`video:${data.roomId}`);
            console.log(`[Socket.io] ${data.userName} (${socket.id}) joined video:${data.roomId}`);

            // Store user data on socket
            (socket as any).userData = {
                id: data.userId,
                name: data.userName,
                image: data.userImage,
                roomId: data.roomId,
            };

            // Notify others in the room
            socket.to(`video:${data.roomId}`).emit("user-joined-room", {
                socketId: socket.id,
                userId: data.userId,
                userName: data.userName,
                userImage: data.userImage,
            });

            // Get all sockets in the room to tell the new user who's already there
            const room = io.sockets.adapter.rooms.get(`video:${data.roomId}`);
            if (room) {
                const existingUsers: any[] = [];
                room.forEach((socketId) => {
                    const s = io.sockets.sockets.get(socketId);
                    if (s && socketId !== socket.id && (s as any).userData) {
                        existingUsers.push({
                            socketId,
                            ...(s as any).userData,
                        });
                    }
                });
                socket.emit("existing-users", existingUsers);
            }
        });

        // Leave video room
        socket.on("leave-room", (roomId: string) => {
            socket.leave(`video:${roomId}`);
            socket.to(`video:${roomId}`).emit("user-left-room", {
                socketId: socket.id,
            });
        });

        // WebRTC signaling: send offer
        socket.on("offer", (data: { targetSocketId: string; offer: any }) => {
            io.to(data.targetSocketId).emit("offer", {
                offer: data.offer,
                fromSocketId: socket.id,
                userData: (socket as any).userData,
            });
        });

        // WebRTC signaling: send answer
        socket.on("answer", (data: { targetSocketId: string; answer: any }) => {
            io.to(data.targetSocketId).emit("answer", {
                answer: data.answer,
                fromSocketId: socket.id,
            });
        });

        // WebRTC signaling: ICE candidate
        socket.on("ice-candidate", (data: { targetSocketId: string; candidate: any }) => {
            io.to(data.targetSocketId).emit("ice-candidate", {
                candidate: data.candidate,
                fromSocketId: socket.id,
            });
        });

        // WebRTC: ICE restart request
        socket.on("ice-restart", (data: { targetSocketId: string }) => {
            io.to(data.targetSocketId).emit("ice-restart-request", {
                fromSocketId: socket.id,
            });
        });

        // Video room chat message
        socket.on("video-chat-message", (data: { roomId: string; message: any }) => {
            socket.to(`video:${data.roomId}`).emit("video-chat-message", {
                message: data.message,
            });
        });

        // ==================== DISCONNECT HANDLING ====================

        socket.on("disconnect", () => {
            console.log(`[Socket.io] Client disconnected: ${socket.id}`);

            // Notify video room
            const userData = (socket as any).userData;
            if (userData?.roomId) {
                socket.to(`video:${userData.roomId}`).emit("user-left-room", {
                    socketId: socket.id,
                });
            }

            // Notify document room
            const docId = (socket as any).currentDocId;
            if (docId) {
                socket.to(`doc:${docId}`).emit("user-left-doc", {
                    socketId: socket.id,
                });
            }

            // Notify kanban board room
            const boardId = (socket as any).currentBoardId;
            if (boardId) {
                socket.to(`board:${boardId}`).emit("user-left-board", {
                    socketId: socket.id,
                });
            }
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Socket.io server running on /api/socketio`);
    });
});
