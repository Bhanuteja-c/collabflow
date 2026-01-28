// server.js - Production server with Socket.io for real-time collaboration
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server: SocketIOServer } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
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
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ["websocket", "polling"],
        allowUpgrades: true,
        perMessageDeflate: false,
        httpCompression: false,
        maxHttpBufferSize: 1e6,
    });

    // Store globally for API routes
    global.io = io;

    io.on("connection", (socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id}`);

        // CHAT CHANNEL EVENTS
        socket.on("join-channel", (channelId) => {
            socket.join(`channel:${channelId}`);
            socket.currentChannelId = channelId;
            socket.to(`channel:${channelId}`).emit("user-joined", socket.id);
        });

        socket.on("leave-channel", (channelId) => {
            socket.leave(`channel:${channelId}`);
            socket.to(`channel:${channelId}`).emit("user-left", socket.id);
            socket.currentChannelId = null;
        });

        socket.on("typing", (data) => {
            socket.to(`channel:${data.channelId}`).emit("user-typing", {
                userId: data.userId,
                name: data.name,
            });
        });

        socket.on("stop-typing", (data) => {
            socket.to(`channel:${data.channelId}`).emit("user-stop-typing", {
                userId: data.userId,
            });
        });

        // DOCUMENT COLLABORATION EVENTS
        socket.on("join-document", (data) => {
            socket.join(`doc:${data.documentId}`);
            socket.docUser = data.user;
            socket.currentDocId = data.documentId;

            socket.to(`doc:${data.documentId}`).emit("user-joined-doc", {
                socketId: socket.id,
                user: data.user,
            });

            const room = io.sockets.adapter.rooms.get(`doc:${data.documentId}`);
            if (room) {
                const existingUsers = [];
                room.forEach((socketId) => {
                    const s = io.sockets.sockets.get(socketId);
                    if (s && socketId !== socket.id && s.docUser) {
                        existingUsers.push({ socketId, user: s.docUser });
                    }
                });
                socket.emit("existing-doc-users", existingUsers);
            }
        });

        socket.on("leave-document", (documentId) => {
            socket.leave(`doc:${documentId}`);
            socket.to(`doc:${documentId}`).emit("user-left-doc", { socketId: socket.id });
            socket.currentDocId = null;
        });

        socket.on("cursor-update", (data) => {
            socket.to(`doc:${data.documentId}`).emit("cursor-update", {
                socketId: socket.id,
                user: socket.docUser,
                cursor: data.cursor,
            });
        });

        socket.on("doc-update", (data) => {
            socket.to(`doc:${data.documentId}`).emit("doc-update", { update: data.update });
        });

        socket.on("awareness-update", (data) => {
            socket.to(`doc:${data.documentId}`).emit("awareness-update", {
                socketId: socket.id,
                awareness: data.awareness,
            });
        });

        // KANBAN BOARD EVENTS
        socket.on("join-board", (boardId) => {
            socket.join(`board:${boardId}`);
            socket.currentBoardId = boardId;
        });

        socket.on("leave-board", (boardId) => {
            socket.leave(`board:${boardId}`);
            socket.currentBoardId = null;
        });

        socket.on("card-moved", (data) => {
            socket.to(`board:${data.boardId}`).emit("card-moved", data);
        });

        socket.on("card-created", (data) => {
            socket.to(`board:${data.boardId}`).emit("card-created", data);
        });

        socket.on("card-updated", (data) => {
            socket.to(`board:${data.boardId}`).emit("card-updated", data);
        });

        socket.on("card-deleted", (data) => {
            socket.to(`board:${data.boardId}`).emit("card-deleted", data);
        });

        // VIDEO ROOM EVENTS
        socket.on("join-room", (data) => {
            socket.join(`video:${data.roomId}`);
            socket.userData = {
                id: data.userId,
                name: data.userName,
                image: data.userImage,
                roomId: data.roomId,
            };

            socket.to(`video:${data.roomId}`).emit("user-joined-room", {
                socketId: socket.id,
                userId: data.userId,
                userName: data.userName,
                userImage: data.userImage,
            });

            const room = io.sockets.adapter.rooms.get(`video:${data.roomId}`);
            if (room) {
                const existingUsers = [];
                room.forEach((socketId) => {
                    const s = io.sockets.sockets.get(socketId);
                    if (s && socketId !== socket.id && s.userData) {
                        existingUsers.push({ socketId, ...s.userData });
                    }
                });
                socket.emit("existing-users", existingUsers);
            }
        });

        socket.on("leave-room", (roomId) => {
            socket.leave(`video:${roomId}`);
            socket.to(`video:${roomId}`).emit("user-left-room", { socketId: socket.id });
        });

        socket.on("offer", (data) => {
            io.to(data.targetSocketId).emit("offer", {
                offer: data.offer,
                fromSocketId: socket.id,
                userData: socket.userData,
            });
        });

        socket.on("answer", (data) => {
            io.to(data.targetSocketId).emit("answer", {
                answer: data.answer,
                fromSocketId: socket.id,
            });
        });

        socket.on("ice-candidate", (data) => {
            io.to(data.targetSocketId).emit("ice-candidate", {
                candidate: data.candidate,
                fromSocketId: socket.id,
            });
        });

        socket.on("ice-restart", (data) => {
            io.to(data.targetSocketId).emit("ice-restart-request", {
                fromSocketId: socket.id,
            });
        });

        socket.on("video-chat-message", (data) => {
            socket.to(`video:${data.roomId}`).emit("video-chat-message", {
                message: data.message,
            });
        });

        // DISCONNECT HANDLING
        socket.on("disconnect", () => {
            console.log(`[Socket.io] Client disconnected: ${socket.id}`);

            if (socket.userData?.roomId) {
                socket.to(`video:${socket.userData.roomId}`).emit("user-left-room", {
                    socketId: socket.id,
                });
            }

            if (socket.currentDocId) {
                socket.to(`doc:${socket.currentDocId}`).emit("user-left-doc", {
                    socketId: socket.id,
                });
            }

            if (socket.currentBoardId) {
                socket.to(`board:${socket.currentBoardId}`).emit("user-left-board", {
                    socketId: socket.id,
                });
            }
        });
    });

    httpServer.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Socket.io server running on /api/socketio`);
    });
});
