// src/hooks/useSocket.ts
// Socket.io client hook for real-time chat with reconnection handling
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
    id: string;
    content: string;
    createdAt: string;
    author: {
        id: string;
        name: string | null;
        image: string | null;
    };
    reactions?: any[];
    attachments?: any;
}

interface TypingUser {
    userId: string;
    name: string;
}

interface UseSocketReturn {
    connected: boolean;
    messages: Message[];
    typingUsers: TypingUser[];
    sendTyping: (userId: string, name: string) => void;
    addMessage: (message: Message) => void;
    connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
}

export function useSocket(channelId: string | null): UseSocketReturn {
    const [connected, setConnected] = useState(false);
    const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptRef = useRef(0);

    useEffect(() => {
        // Initialize socket connection with production settings
        const socket = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
            // Reconnection settings for stability
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            randomizationFactor: 0.5,
            timeout: 20000,
            // Lower latency settings
            forceNew: false,
            multiplex: true,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[Socket.io] Connected:", socket.id);
            setConnected(true);
            setConnectionState('connected');
            reconnectAttemptRef.current = 0;

            // Rejoin channel if we had one
            if (channelId) {
                socket.emit("join-channel", channelId);
            }
        });

        socket.on("disconnect", (reason) => {
            console.log("[Socket.io] Disconnected:", reason);
            setConnected(false);
            setConnectionState('disconnected');
        });

        socket.on("reconnect_attempt", (attemptNumber) => {
            console.log("[Socket.io] Reconnect attempt:", attemptNumber);
            setConnectionState('reconnecting');
            reconnectAttemptRef.current = attemptNumber;
        });

        socket.on("reconnect", (attemptNumber) => {
            console.log("[Socket.io] Reconnected after", attemptNumber, "attempts");
            setConnected(true);
            setConnectionState('connected');
        });

        socket.on("connect_error", (err) => {
            console.error("[Socket.io] Connection error:", err.message);
            setConnectionState('disconnected');
        });

        // Listen for new messages
        socket.on("new-message", (message: Message) => {
            setMessages((prev) => {
                // Prevent duplicates
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
        });

        // Listen for typing indicators
        socket.on("user-typing", (data: TypingUser) => {
            setTypingUsers((prev) => {
                if (prev.some((u) => u.userId === data.userId)) return prev;
                return [...prev, data];
            });

            // Auto-remove after 3 seconds
            setTimeout(() => {
                setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
            }, 3000);
        });

        socket.on("user-stop-typing", (data: { userId: string }) => {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        });

        // Listen for reactions
        socket.on("message-reaction", (data: any) => {
            setMessages((prev) =>
                prev.map((msg) => {
                    if (msg.id !== data.messageId) return msg;
                    const reactions = msg.reactions || [];
                    if (data.action === "added") {
                        return { ...msg, reactions: [...reactions, data] };
                    } else {
                        return {
                            ...msg,
                            reactions: reactions.filter(
                                (r: any) => !(r.userId === data.userId && r.emoji === data.emoji)
                            ),
                        };
                    }
                })
            );
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    // Join/leave channel when channelId changes
    useEffect(() => {
        if (!socketRef.current || !channelId) return;

        // Clear previous messages when switching channels
        setMessages([]);
        setTypingUsers([]);

        socketRef.current.emit("join-channel", channelId);

        return () => {
            socketRef.current?.emit("leave-channel", channelId);
        };
    }, [channelId]);

    // Send typing indicator (debounced)
    const sendTyping = useCallback(
        (userId: string, name: string) => {
            if (!socketRef.current || !channelId || typingTimeoutRef.current) return;

            socketRef.current.emit("typing", { channelId, userId, name });

            typingTimeoutRef.current = setTimeout(() => {
                typingTimeoutRef.current = null;
            }, 2000);
        },
        [channelId]
    );

    // Add a message locally (for optimistic updates)
    const addMessage = useCallback((message: Message) => {
        setMessages((prev) => {
            // Prevent duplicates
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
        });
    }, []);

    return {
        connected,
        connectionState,
        messages,
        typingUsers,
        sendTyping,
        addMessage,
    };
}
