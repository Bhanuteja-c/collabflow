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
}
