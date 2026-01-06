// src/hooks/useSocket.ts
// Socket.io client hook for real-time chat
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
}

export function useSocket(channelId: string | null): UseSocketReturn {
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Initialize socket connection
        const socket = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[Socket.io] Connected:", socket.id);
            setConnected(true);
        });

        socket.on("disconnect", () => {
            console.log("[Socket.io] Disconnected");
            setConnected(false);
        });

        socket.on("connect_error", (err) => {
            console.error("[Socket.io] Connection error:", err.message);
        });

        // Listen for new messages
        socket.on("new-message", (message: Message) => {
            setMessages((prev) => [...prev, message]);
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
    }, []);

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

    // Send typing indicator (throttled)
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
        setMessages((prev) => [...prev, message]);
    }, []);

    return {
        connected,
        messages,
        typingUsers,
        sendTyping,
        addMessage,
    };
}
