// src/hooks/useVideoCall.ts
// WebRTC video call hook with production-ready features
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
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
    iceCandidateBuffer: RTCIceCandidateInit[];
}

export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    userImage: string;
    content: string;
    timestamp: Date;
}

export interface Reaction {
    id: string;
    userId: string;
    userName: string;
    emoji: string;
    timestamp: number;
}

export interface Knocker {
    socketId: string;
    userId: string;
    userName: string;
    userImage: string;
}

export interface Poll {
    pollId: string;
    question: string;
    options: string[];
    createdBy: string;
    votes: Record<string, string[]>; // option -> userIds
}

interface UseVideoCallOptions {
    roomId: string;
    userId: string;
    userName: string;
    userImage: string;
    localStream: MediaStream | null;
}

// ICE servers for WebRTC connectivity
const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    // TURN server for NAT traversal (required for ~30% of users)
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
    const [roomFull, setRoomFull] = useState(false);
    const [handRaisedUsers, setHandRaisedUsers] = useState<Set<string>>(new Set());
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [knockers, setKnockers] = useState<Knocker[]>([]);
    const [polls, setPolls] = useState<Poll[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const peersRef = useRef<Map<string, Peer>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(localStream);
    const iceRestartTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const iceRestartCountRef = useRef<Map<string, number>>(new Map());
    const [reconnectingPeers, setReconnectingPeers] = useState<Set<string>>(new Set());

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

    // Toggle hand raise
    const toggleHandRaise = useCallback(() => {
        if (!socketRef.current || !roomId) return;
        const currentlyRaised = handRaisedUsers.has(userId);
        const newRaised = !currentlyRaised;

        // Update locally
        setHandRaisedUsers(prev => {
            const next = new Set(prev);
            if (newRaised) next.add(userId); else next.delete(userId);
            return next;
        });

        socketRef.current.emit("hand-raise", { roomId, raised: newRaised });
    }, [roomId, userId, handRaisedUsers]);

    // Send reaction
    const sendReaction = useCallback((emoji: string) => {
        if (!socketRef.current || !roomId) return;
        socketRef.current.emit("reaction", { roomId, emoji });
    }, [roomId]);

    // Admit knocker into the room
    const admitUser = useCallback((targetSocketId: string) => {
        socketRef.current?.emit("admit-user", { roomId, targetSocketId });
        setKnockers(prev => prev.filter(k => k.socketId !== targetSocketId));
    }, [roomId]);

    // Reject knocker
    const rejectUser = useCallback((targetSocketId: string) => {
        socketRef.current?.emit("reject-user", { roomId, targetSocketId });
        setKnockers(prev => prev.filter(k => k.socketId !== targetSocketId));
    }, [roomId]);

    // Update display name mid-call
    const updateDisplayName = useCallback((newName: string) => {
        socketRef.current?.emit("update-display-name", { roomId, newName });
    }, [roomId]);

    // Create a poll
    const createPoll = useCallback((question: string, options: string[]) => {
        socketRef.current?.emit("create-poll", { roomId, question, options });
    }, [roomId]);

    // Vote on a poll
    const votePoll = useCallback((pollId: string, option: string) => {
        socketRef.current?.emit("vote-poll", { roomId, pollId, option });
    }, [roomId]);

    // Replace video track with screen share
    const replaceVideoTrack = useCallback((newTrack: MediaStreamTrack) => {
        console.log(`[WebRTC] Replacing video track with:`, newTrack.label);

        peersRef.current.forEach((peer, socketId) => {
            const senders = peer.connection.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');

            if (videoSender) {
                videoSender.replaceTrack(newTrack)
                    .then(() => console.log(`[WebRTC] Track replaced for ${socketId}`))
                    .catch(err => console.error(`[WebRTC] Failed to replace track:`, err));
            } else {
                // Try to find via transceiver
                const transceiver = peer.connection.getTransceivers().find(t =>
                    t.receiver.track?.kind === 'video' || t.mid?.includes('video')
                );
                if (transceiver && transceiver.sender) {
                    transceiver.sender.replaceTrack(newTrack).catch(e => console.error("Replace track error:", e));
                } else {
                    console.warn(`[WebRTC] No video sender found for ${socketId}`);
                }
            }
        });
    }, []);

    // Replace audio track (for screen share with audio)
    const replaceAudioTrack = useCallback((newTrack: MediaStreamTrack) => {
        peersRef.current.forEach((peer, socketId) => {
            const senders = peer.connection.getSenders();
            const audioSender = senders.find(s => s.track?.kind === 'audio');

            if (audioSender) {
                audioSender.replaceTrack(newTrack)
                    .catch(err => console.error(`[WebRTC] Failed to replace audio track for ${socketId}:`, err));
            }
        });
    }, []);

    // Active speakers state
    const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set());

    // Toggle local speaking status
    const setLocalSpeaking = useCallback((isSpeaking: boolean) => {
        if (!socketRef.current || !roomId) return;
        
        // Immediately update local state so the user sees their own speaking ring
        setActiveSpeakers(prev => {
            const newSet = new Set(prev);
            if (isSpeaking) newSet.add(userId);
            else newSet.delete(userId);
            return newSet;
        });

        socketRef.current.emit("speaking-status", { roomId, isSpeaking });
    }, [roomId, userId]);
    const performIceRestart = useCallback((socketId: string) => {
        const peer = peersRef.current.get(socketId);
        if (!peer || !socketRef.current) return;

        const retries = iceRestartCountRef.current.get(socketId) || 0;
        const MAX_RETRIES = 4;

        const cleanupDeadPeer = () => {
            peer.connection.close();
            // @ts-ignore - forcefully release reference
            peer.connection = null;
            setReconnectingPeers(prev => { const n = new Set(prev); n.delete(socketId); return n; });
            peersRef.current.delete(socketId);
            socketRef.current?.emit("peer-disconnected", { peerId: socketId });
            setPeers(prev => prev.filter(p => p.socketId !== socketId));
        };

        if (retries >= MAX_RETRIES) {
            console.warn(`[WebRTC] Max ICE restart retries reached for ${socketId}`);
            cleanupDeadPeer();
            return;
        }

        iceRestartCountRef.current.set(socketId, retries + 1);
        setReconnectingPeers(prev => new Set(prev).add(socketId));

        console.log(`[WebRTC] ICE restart attempt ${retries + 1}/${MAX_RETRIES} for ${socketId}`);

        peer.connection.createOffer({ iceRestart: true })
            .then(offer => peer.connection.setLocalDescription(offer))
            .then(() => {
                if (socketRef.current && peer.connection.localDescription) {
                    socketRef.current.emit("offer", {
                        targetSocketId: socketId,
                        offer: peer.connection.localDescription,
                    });
                }
            })
            .catch(err => {
                console.error("[WebRTC] ICE restart failed:", err);
                cleanupDeadPeer();
            });
    }, []);

    // Monitor connection quality
    const getConnectionQuality = useCallback((pc: RTCPeerConnection): Peer['connectionQuality'] => {
        const state = pc.iceConnectionState;
        switch (state) {
            case 'connected':
            case 'completed':
                return 'excellent';
            case 'checking':
                return 'good';
            case 'disconnected':
                return 'fair';
            case 'failed':
                return 'poor';
            default:
                return 'unknown';
        }
    }, []);

    // Update peer connection quality
    const updatePeerQuality = useCallback((socketId: string, quality: Peer['connectionQuality']) => {
        const peer = peersRef.current.get(socketId);
        if (peer) {
            peer.connectionQuality = quality;
            peersRef.current.set(socketId, peer);
            setPeers(Array.from(peersRef.current.values()));
        }
    }, []);

    // Create peer connection with production-ready settings
    const createPeerConnection = useCallback((targetSocketId: string, userData: UserData, isInitiator: boolean) => {
        if (peersRef.current.has(targetSocketId)) {
            return peersRef.current.get(targetSocketId)!.connection;
        }

        const pc = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
            iceCandidatePoolSize: 10,
        });

        // Add local tracks
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

        // Handle ICE connection state changes
        pc.oniceconnectionstatechange = () => {
            console.log(`[WebRTC] ICE state ${targetSocketId}: ${pc.iceConnectionState}`);
            updatePeerQuality(targetSocketId, getConnectionQuality(pc));

            // Auto ICE restart on disconnected/failed
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                const existingTimeout = iceRestartTimeoutRef.current.get(targetSocketId);
                if (existingTimeout) clearTimeout(existingTimeout);

                const retries = iceRestartCountRef.current.get(targetSocketId) || 0;
                const delay = Math.min(2000 * Math.pow(2, retries), 16000); // 2s, 4s, 8s, 16s

                const timeout = setTimeout(() => {
                    if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                        performIceRestart(targetSocketId);
                    }
                }, delay);
                iceRestartTimeoutRef.current.set(targetSocketId, timeout);
            }

            // Clear reconnecting state and reset retry counter on successful connection
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                iceRestartCountRef.current.delete(targetSocketId);
                setReconnectingPeers(prev => {
                    const n = new Set(prev);
                    n.delete(targetSocketId);
                    return n;
                });
                const existingTimeout = iceRestartTimeoutRef.current.get(targetSocketId);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                    iceRestartTimeoutRef.current.delete(targetSocketId);
                }
            }
        };

        // Handle connection state
        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] Connection state ${targetSocketId}: ${pc.connectionState}`);
            if (pc.connectionState === "failed") {
                // Try ICE restart first
                performIceRestart(targetSocketId);
            }
        };

        // Store peer
        const peer: Peer = {
            socketId: targetSocketId,
            userData,
            connection: pc,
            stream: null,
            connectionQuality: 'unknown',
            iceCandidateBuffer: [],
        };
        peersRef.current.set(targetSocketId, peer);
        setPeers(Array.from(peersRef.current.values()));

        // Create offer if initiator
        if (isInitiator) {
            pc.createOffer()
                .then((offer) => pc.setLocalDescription(offer))
                .then(() => {
                    if (socketRef.current && pc.localDescription) {
                        socketRef.current.emit("offer", {
                            targetSocketId,
                            offer: pc.localDescription,
                        });
                    }
                })
                .catch(console.error);
        }

        return pc;
    }, [performIceRestart, updatePeerQuality, getConnectionQuality]);

    // Remove peer
    const removePeer = useCallback((socketId: string) => {
        const peer = peersRef.current.get(socketId);
        if (peer) {
            peer.connection.close();
            peersRef.current.delete(socketId);
            setPeers(Array.from(peersRef.current.values()));
        }
        // Clear ICE restart timeout
        const timeout = iceRestartTimeoutRef.current.get(socketId);
        if (timeout) {
            clearTimeout(timeout);
            iceRestartTimeoutRef.current.delete(socketId);
        }
    }, []);

    useEffect(() => {
        if (!roomId) return;

        console.log(`[Socket.io] Connecting to room: ${roomId}`);

        // Initialize socket with production settings
        const socket = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[Socket.io] Video connected:", socket.id);
            setConnected(true);

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

        socket.on("reconnect", () => {
            console.log("[Socket.io] Video reconnected");
            socket.emit("join-room", { roomId, userId, userName, userImage });
        });

        // TASK 6: Handle room full — server rejects join above 6 participants
        socket.on("room-full", (data: { max: number }) => {
            console.warn(`[Socket.io] Room is full (max ${data.max} participants)`);
            setRoomFull(true);
        });

        // Handle existing users
        socket.on("existing-users", (users: Array<{ socketId: string; id: string; name: string; image: string }>) => {
            console.log("[Socket.io] Existing users:", users);
            users.forEach((user) => {
                createPeerConnection(
                    user.socketId,
                    { id: user.id, name: user.name, image: user.image },
                    true
                );
            });
        });

        // Handle new user joining — existing user should NOT initiate (wait for offer)
        socket.on("user-joined-room", (data: { socketId: string; userId: string; userName: string; userImage: string }) => {
            console.log("[Socket.io] User joined:", data);
            createPeerConnection(
                data.socketId,
                { id: data.userId, name: data.userName, image: data.userImage },
                false  // Existing user waits for offer from new joiner
            );
        });

        // Handle offer
        socket.on("offer", async (data: { offer: RTCSessionDescriptionInit; fromSocketId: string; userData: UserData }) => {
            let peer = peersRef.current.get(data.fromSocketId);

            if (!peer) {
                createPeerConnection(data.fromSocketId, data.userData, false);
                peer = peersRef.current.get(data.fromSocketId)!;
            }

            const pc = peer.connection;

            try {
                // Handle glare: if we already have a local offer, rollback first
                if (pc.signalingState === 'have-local-offer') {
                    console.log(`[WebRTC] Glare detected with ${data.fromSocketId}, rolling back`);
                    await pc.setLocalDescription({ type: 'rollback' });
                }

                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

                // Drain buffered ICE candidates
                if (peer.iceCandidateBuffer.length > 0) {
                    console.log(`[WebRTC] Draining ${peer.iceCandidateBuffer.length} buffered ICE candidates`);
                    for (const candidate of peer.iceCandidateBuffer) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                    peer.iceCandidateBuffer = [];
                }

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
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
            const peer = peersRef.current.get(data.fromSocketId);
            if (peer) {
                try {
                    await peer.connection.setRemoteDescription(new RTCSessionDescription(data.answer));

                    // Drain buffered ICE candidates
                    if (peer.iceCandidateBuffer.length > 0) {
                        console.log(`[WebRTC] Draining ${peer.iceCandidateBuffer.length} buffered ICE candidates after answer`);
                        for (const candidate of peer.iceCandidateBuffer) {
                            await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
                        }
                        peer.iceCandidateBuffer = [];
                    }
                } catch (err) {
                    console.error("[WebRTC] Error setting answer:", err);
                }
            }
        });

        // Handle ICE candidate — buffer if remote description not yet set
        socket.on("ice-candidate", async (data: { candidate: RTCIceCandidateInit; fromSocketId: string }) => {
            const peer = peersRef.current.get(data.fromSocketId);
            if (peer) {
                try {
                    if (peer.connection.remoteDescription) {
                        await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } else {
                        // Buffer candidate until remote description is set
                        peer.iceCandidateBuffer.push(data.candidate);
                    }
                } catch (err) {
                    console.error("[WebRTC] Error adding ICE candidate:", err);
                }
            }
        });

        // Handle ICE restart request
        socket.on("ice-restart-request", async (data: { fromSocketId: string }) => {
            console.log("[WebRTC] Received ICE restart request from:", data.fromSocketId);
            performIceRestart(data.fromSocketId);
        });

        // Handle user leaving
        socket.on("user-left-room", (data: { socketId: string }) => {
            console.log("[Socket.io] User left:", data.socketId);
            removePeer(data.socketId);
        });

        // Handle chat messages
        socket.on("video-chat-message", (data: { message: ChatMessage }) => {
            setChatMessages(prev => [...prev, {
                ...data.message,
                timestamp: new Date(data.message.timestamp),
            }]);
        });

        // Handle speaking status
        socket.on("speaking-status", (data: { userId: string; isSpeaking: boolean }) => {
            setActiveSpeakers(prev => {
                const newSet = new Set(prev);
                if (data.isSpeaking) {
                    newSet.add(data.userId);
                } else {
                    newSet.delete(data.userId);
                }
                return newSet;
            });
        });

        // Handle hand raise
        socket.on("hand-raise", (data: { userId: string; raised: boolean }) => {
            setHandRaisedUsers(prev => {
                const next = new Set(prev);
                if (data.raised) next.add(data.userId); else next.delete(data.userId);
                return next;
            });
        });

        // Handle reactions — auto-remove after 3s
        socket.on("reaction", (data: Reaction) => {
            const reaction = { ...data, timestamp: Date.now() };
            setReactions(prev => [...prev, reaction]);
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== reaction.id));
            }, 3000);
        });

        // Waiting room knockers
        socket.on("knock", (data: Knocker) => {
            setKnockers(prev => [...prev, data]);
        });

        // Display name updates from peers
        socket.on("display-name-updated", (data: { userId: string; newName: string }) => {
            peersRef.current.forEach((peer, socketId) => {
                if (peer.userData.id === data.userId) {
                    peer.userData.name = data.newName;
                    peersRef.current.set(socketId, peer);
                }
            });
            setPeers(Array.from(peersRef.current.values()));
        });

        // Polls
        socket.on("poll-created", (data: Poll) => {
            setPolls(prev => [...prev, data]);
        });

        socket.on("poll-vote", (data: { pollId: string; option: string; userId: string }) => {
            setPolls(prev => prev.map(p => {
                if (p.pollId !== data.pollId) return p;
                const votes = { ...p.votes };
                // Remove previous vote by this user
                for (const opt of Object.keys(votes)) {
                    votes[opt] = (votes[opt] || []).filter(id => id !== data.userId);
                }
                // Add new vote
                votes[data.option] = [...(votes[data.option] || []), data.userId];
                return { ...p, votes };
            }));
        });

        return () => {
            socket.emit("leave-room", roomId);
            // These refs hold stable Map instances — safe to access in cleanup
             
            peersRef.current.forEach((peer) => peer.connection.close());
            // eslint-disable-next-line react-hooks/exhaustive-deps
            peersRef.current.clear();
             
            iceRestartTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
            // eslint-disable-next-line react-hooks/exhaustive-deps
            iceRestartTimeoutRef.current.clear();
            socket.disconnect();
            socketRef.current = null;
        };
    }, [roomId, userId, userName, userImage, createPeerConnection, removePeer, performIceRestart]);

    return {
        connected,
        peers,
        chatMessages,
        roomFull,
        sendChatMessage,
        replaceVideoTrack,
        replaceAudioTrack,
        activeSpeakers,
        setLocalSpeaking,
        handRaisedUsers,
        toggleHandRaise,
        reactions,
        sendReaction,
        reconnectingPeers,
        knockers,
        admitUser,
        rejectUser,
        updateDisplayName,
        polls,
        createPoll,
        votePoll,
    };
}
