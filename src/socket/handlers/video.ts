// src/socket/handlers/video.ts
// Video room events: join, leave, WebRTC signaling, chat
import type { Server, Socket } from "socket.io";
import type { SocketData } from "../types";
import { makeRoomId, ROOM_PREFIX } from "../types";

const MAX_VIDEO_PARTICIPANTS = 6;

export function registerVideoHandlers(io: Server, socket: Socket<any, any, any, SocketData>) {
    socket.on("join-room", (data: { roomId: string; userId: string; userName: string; userImage: string }) => {
        const room = makeRoomId(ROOM_PREFIX.VIDEO, data.roomId);

        // TASK 6: Enforce participant limit (server-side)
        const existingRoom = io.sockets.adapter.rooms.get(room);
        if (existingRoom && existingRoom.size >= MAX_VIDEO_PARTICIPANTS) {
            socket.emit("room-full", { max: MAX_VIDEO_PARTICIPANTS });
            return;
        }

        socket.join(room);

        // Notify others in the room
        socket.to(room).emit("user-joined-room", {
            socketId: socket.id,
            userId: socket.data.userId, // Use verified userId
            userName: data.userName,
            userImage: data.userImage,
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
                        id: s.data.userId,
                        name: s.data.userName,
                        image: s.data.userImage,
                    });
                }
            }
            socket.emit("existing-users", existingUsers);
        }
    });

    socket.on("leave-room", (roomId: string) => {
        const room = makeRoomId(ROOM_PREFIX.VIDEO, roomId);
        socket.leave(room);
        socket.to(room).emit("user-left-room", { socketId: socket.id });
    });

    // WebRTC signaling: offer
    socket.on("offer", (data: { targetSocketId: string; offer: any }) => {
        io.to(data.targetSocketId).emit("offer", {
            offer: data.offer,
            fromSocketId: socket.id,
            userData: { id: socket.data.userId, name: socket.data.userName, image: socket.data.userImage },
        });
    });

    // WebRTC signaling: answer
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

    // WebRTC: ICE restart
    socket.on("ice-restart", (data: { targetSocketId: string }) => {
        io.to(data.targetSocketId).emit("ice-restart-request", {
            fromSocketId: socket.id,
        });
    });

    // Video room chat
    socket.on("video-chat-message", (data: { roomId: string; message: any }) => {
        socket.to(makeRoomId(ROOM_PREFIX.VIDEO, data.roomId)).emit("video-chat-message", {
            message: data.message,
        });
    });

    // Speaking status
    socket.on("speaking-status", (data: { roomId: string; isSpeaking: boolean }) => {
        socket.to(makeRoomId(ROOM_PREFIX.VIDEO, data.roomId)).emit("speaking-status", {
            userId: socket.data.userId,
            isSpeaking: data.isSpeaking,
        });
    });

    // Hand raise
    socket.on("hand-raise", (data: { roomId: string; raised: boolean }) => {
        socket.to(makeRoomId(ROOM_PREFIX.VIDEO, data.roomId)).emit("hand-raise", {
            userId: socket.data.userId,
            raised: data.raised,
        });
    });

    // Emoji reactions
    socket.on("reaction", (data: { roomId: string; emoji: string }) => {
        // Broadcast to everyone including sender for consistent animation
        io.to(makeRoomId(ROOM_PREFIX.VIDEO, data.roomId)).emit("reaction", {
            userId: socket.data.userId,
            userName: socket.data.userName,
            emoji: data.emoji,
            id: `${socket.id}-${Date.now()}`,
        });
    });

    // ─── Waiting Room ───
    socket.on("knock", (data: { roomId: string; userId: string; userName: string; userImage: string }) => {
        const room = makeRoomId(ROOM_PREFIX.VIDEO, data.roomId);
        // Notify everyone in the room (host will see a toast)
        socket.to(room).emit("knock", {
            socketId: socket.id,
            userId: data.userId,
            userName: data.userName,
            userImage: data.userImage,
        });
    });

    socket.on("admit-user", (data: { roomId: string; targetSocketId: string }) => {
        // Tell the waiting user they've been admitted
        io.to(data.targetSocketId).emit("admitted", { roomId: data.roomId });
    });

    socket.on("reject-user", (data: { roomId: string; targetSocketId: string }) => {
        io.to(data.targetSocketId).emit("rejected", { roomId: data.roomId });
    });

    // ─── Display Name Update ───
    socket.on("update-display-name", (data: { roomId: string; newName: string }) => {
        socket.data.userName = data.newName;
        socket.to(makeRoomId(ROOM_PREFIX.VIDEO, data.roomId)).emit("display-name-updated", {
            userId: socket.data.userId,
            newName: data.newName,
        });
    });

    // ─── In-Meeting Polls ───
    socket.on("create-poll", (data: { roomId: string; question: string; options: string[] }) => {
        const pollId = `poll-${Date.now()}`;
        io.to(makeRoomId(ROOM_PREFIX.VIDEO, data.roomId)).emit("poll-created", {
            pollId,
            question: data.question,
            options: data.options,
            createdBy: socket.data.userName,
            votes: {} as Record<string, string[]>, // option -> userId[]
        });
    });

    socket.on("vote-poll", (data: { roomId: string; pollId: string; option: string }) => {
        io.to(makeRoomId(ROOM_PREFIX.VIDEO, data.roomId)).emit("poll-vote", {
            pollId: data.pollId,
            option: data.option,
            userId: socket.data.userId,
            userName: socket.data.userName,
        });
    });

    // ─── Whiteboard ───
    socket.on("whiteboard-draw", (data: { roomId: string; stroke: any }) => {
        socket.to(makeRoomId(ROOM_PREFIX.VIDEO, data.roomId)).emit("whiteboard-draw", {
            stroke: data.stroke,
            userId: socket.data.userId,
        });
    });

    socket.on("whiteboard-clear", (data: { roomId: string }) => {
        socket.to(makeRoomId(ROOM_PREFIX.VIDEO, data.roomId)).emit("whiteboard-clear", {
            userId: socket.data.userId,
        });
    });

    socket.on("whiteboard-undo", (data: { roomId: string; strokeId: string }) => {
        socket.to(makeRoomId(ROOM_PREFIX.VIDEO, data.roomId)).emit("whiteboard-undo", {
            strokeId: data.strokeId,
            userId: socket.data.userId,
        });
    });
}
