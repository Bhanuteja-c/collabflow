// src/hooks/useVideoCall.ts
// WebRTC video call hook using Socket.io for signaling
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface UserData {
    id: string;
    name: string;
    image: string;
}

interface Peer {
    socketId: string;
    userData: UserData;
    connection: RTCPeerConnection;
    stream: MediaStream | null;
}

export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    userImage: string;
    content: string;
    timestamp: Date;
}

interface UseVideoCallOptions {
    roomId: string;
    userId: string;
    userName: string;
    userImage: string;
    localStream: MediaStream | null;
}

const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // TURN server for users behind strict firewalls/NAT (required for reliable video calls)
    // Set NEXT_PUBLIC_TURN_URL, NEXT_PUBLIC_TURN_USERNAME, NEXT_PUBLIC_TURN_CREDENTIAL in production
    ...(process.env.NEXT_PUBLIC_TURN_URL ? [{
        urls: process.env.NEXT_PUBLIC_TURN_URL,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "",
    }] : []),
];

export function useVideoCall({ roomId, userId, userName, userImage, localStream }: UseVideoCallOptions) {
    const [connected, setConnected] = useState(false);
    const [peers, setPeers] = useState<Peer[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const peersRef = useRef<Map<string, Peer>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(localStream);

    // Keep localStreamRef updated
    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    // Send chat message
    const sendChatMessage = useCallback((content: string) => {
        if (!socketRef.current || !roomId) return;

        const message: ChatMessage = {
            id: Date.now().toString(),
            userId,
            userName,
            userImage,
            content,
            timestamp: new Date(),
        };

        // Add locally
        setChatMessages(prev => [...prev, message]);

        // Send to others in room
        socketRef.current.emit("video-chat-message", {
            roomId,
            message,
        });
    }, [roomId, userId, userName, userImage]);

    // Replace video track with screen share
    const replaceVideoTrack = useCallback((newTrack: MediaStreamTrack) => {
        console.log(`[WebRTC] Replacing video track with:`, newTrack.label);

        peersRef.current.forEach((peer, socketId) => {
            const senders = peer.connection.getSenders();
            console.log(`[WebRTC] Peer ${socketId} has ${senders.length} senders`);

            // Try to find video sender - check both track kind and transceiver mid
            let videoSender = senders.find(s => s.track?.kind === 'video');

            // If no video track sender found, look for any sender that could handle video
            if (!videoSender) {
                videoSender = senders.find(s => {
                    const transceiver = peer.connection.getTransceivers().find(t => t.sender === s);
                    return transceiver?.receiver.track?.kind === 'video' ||
                        transceiver?.mid?.includes('video');
                });
            }

            if (videoSender) {
                console.log(`[WebRTC] Replacing track for peer ${socketId}`);
                videoSender.replaceTrack(newTrack)
                    .then(() => console.log(`[WebRTC] Track replaced successfully for ${socketId}`))
                    .catch(err => console.error(`[WebRTC] Failed to replace track for ${socketId}:`, err));
            } else {
                console.warn(`[WebRTC] No video sender found for peer ${socketId}, trying addTrack`);
                // If no video sender exists, try adding the track
                try {
                    const stream = new MediaStream([newTrack]);
                    peer.connection.addTrack(newTrack, stream);
                    console.log(`[WebRTC] Added new video track for ${socketId}`);
                } catch (err) {
                    console.error(`[WebRTC] Failed to add track for ${socketId}:`, err);
                }
            }
        });
    }, []);

    // Create peer connection
    const createPeerConnection = useCallback((targetSocketId: string, userData: UserData, isInitiator: boolean) => {
        // Check if we already have a connection to this peer
        if (peersRef.current.has(targetSocketId)) {
            console.log(`[WebRTC] Already have connection to ${targetSocketId}, skipping`);
            return peersRef.current.get(targetSocketId)!.connection;
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        // Add local tracks if we have them
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log(`[WebRTC] Received track from ${targetSocketId}`);
            const [remoteStream] = event.streams;
            const peer = peersRef.current.get(targetSocketId);
            if (peer) {
                peer.stream = remoteStream ?? null;
                peersRef.current.set(targetSocketId, peer);
                setPeers(Array.from(peersRef.current.values()));
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit("ice-candidate", {
                    targetSocketId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle connection state
        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] Connection state with ${targetSocketId}: ${pc.connectionState}`);
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                removePeer(targetSocketId);
            }
        };

        // Store peer BEFORE creating offer
        const peer: Peer = {
            socketId: targetSocketId,
            userData,
            connection: pc,
            stream: null,
        };
        peersRef.current.set(targetSocketId, peer);
        setPeers(Array.from(peersRef.current.values()));

        // Create offer if initiator
        if (isInitiator) {
            pc.createOffer()
                .then((offer) => pc.setLocalDescription(offer))
                .then(() => {
                    if (socketRef.current && pc.localDescription) {
                        console.log(`[WebRTC] Sending offer to ${targetSocketId}`);
                        socketRef.current.emit("offer", {
                            targetSocketId,
                            offer: pc.localDescription,
                            userData: { id: userId, name: userName, image: userImage },
                        });
                    }
                })
                .catch(console.error);
        }

        return pc;
    }, [userId, userName, userImage]);

    // Remove peer
    const removePeer = useCallback((socketId: string) => {
        const peer = peersRef.current.get(socketId);
        if (peer) {
            peer.connection.close();
            peersRef.current.delete(socketId);
            setPeers(Array.from(peersRef.current.values()));
        }
    }, []);

    useEffect(() => {
        // Only require roomId to connect (not localStream)
        if (!roomId) return;

        console.log(`[Socket.io] Connecting to room: ${roomId}`);

        // Initialize socket
        const socket = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[Socket.io] Video connected:", socket.id);
            setConnected(true);

            // Join the room
            socket.emit("join-room", {
                roomId,
                userId,
                userName,
                userImage,
            });
        });

        socket.on("disconnect", () => {
            console.log("[Socket.io] Video disconnected");
            setConnected(false);
        });

        // Handle existing users in room
        socket.on("existing-users", (users: Array<{ socketId: string; id: string; name: string; image: string }>) => {
            console.log("[Socket.io] Existing users:", users);
            users.forEach((user) => {
                createPeerConnection(
                    user.socketId,
                    { id: user.id, name: user.name, image: user.image },
                    true // I am initiator since I'm the new joiner
                );
            });
        });

        // Handle new user joining - EXISTING users should create offer to NEW user
        socket.on("user-joined-room", (data: { socketId: string; userId: string; userName: string; userImage: string }) => {
            console.log("[Socket.io] User joined room:", data);
            // Create peer connection and send offer (we are the existing user, we initiate)
            createPeerConnection(
                data.socketId,
                { id: data.userId, name: data.userName, image: data.userImage },
                true // WE initiate since we were here first
            );
        });

        // Handle offer
        socket.on("offer", async (data: { offer: RTCSessionDescriptionInit; fromSocketId: string; userData: UserData }) => {
            console.log("[WebRTC] Received offer from:", data.fromSocketId);

            // Check for existing connection
            let pc = peersRef.current.get(data.fromSocketId)?.connection;

            if (!pc) {
                pc = createPeerConnection(data.fromSocketId, data.userData, false);
            }

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                console.log(`[WebRTC] Sending answer to ${data.fromSocketId}`);
                socket.emit("answer", {
                    targetSocketId: data.fromSocketId,
                    answer: pc.localDescription,
                });
            } catch (err) {
                console.error("[WebRTC] Error handling offer:", err);
            }
        });

        // Handle answer
        socket.on("answer", async (data: { answer: RTCSessionDescriptionInit; fromSocketId: string }) => {
            console.log("[WebRTC] Received answer from:", data.fromSocketId);
            const peer = peersRef.current.get(data.fromSocketId);
            if (peer) {
                try {
                    await peer.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
                } catch (err) {
                    console.error("[WebRTC] Error setting remote description:", err);
                }
            }
        });

        // Handle ICE candidate
        socket.on("ice-candidate", async (data: { candidate: RTCIceCandidateInit; fromSocketId: string }) => {
            const peer = peersRef.current.get(data.fromSocketId);
            if (peer) {
                try {
                    await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.error("[WebRTC] Error adding ICE candidate:", err);
                }
            }
        });

        // Handle user leaving
        socket.on("user-left-room", (data: { socketId: string }) => {
            console.log("[Socket.io] User left room:", data.socketId);
            removePeer(data.socketId);
        });

        // Handle chat messages from other users
        socket.on("video-chat-message", (data: { message: ChatMessage }) => {
            console.log("[Socket.io] Received chat message:", data.message);
            setChatMessages(prev => [...prev, {
                ...data.message,
                timestamp: new Date(data.message.timestamp),
            }]);
        });

        return () => {
            // Leave room and cleanup
            socket.emit("leave-room", roomId);
            peersRef.current.forEach((peer) => peer.connection.close());
            peersRef.current.clear();
            socket.disconnect();
            socketRef.current = null;
        };
    }, [roomId, userId, userName, userImage, createPeerConnection, removePeer]);

    return {
        connected,
        peers,
        chatMessages,
        sendChatMessage,
        replaceVideoTrack,
    };
}
