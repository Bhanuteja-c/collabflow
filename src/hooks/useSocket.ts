// src/hooks/useSocket.ts
// Socket.io client hook for real-time chat — uses shared socket from SocketProvider
// Previously created its own socket connection; now consumes SocketProvider's single connection
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSharedSocket } from "@/components/providers/SocketProvider";

interface User {
    id: string;
    name: string;
    image?: string;
}

interface Message {
    id: string;
    content: string;
    createdAt: string;
    author: {
        id: string;
        name: string | null;
        image: string | null;
    };
    reactions?: { emoji: string; userId: string; user?: { id: string; name: string | null } }[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachments?: any;
    isEdited?: boolean;
    editedAt?: string;
    isDeleted?: boolean;
    isPinned?: boolean;
    // Threading
    parentId?: string | null;
    replyCount?: number;
    replies?: { author: { id: string; name: string | null; image: string | null }; createdAt: string }[];
    // UI state for optimistic updates
    status?: 'pending' | 'sent' | 'failed';
}

interface TypingUser {
    userId: string;
    name: string;
}

interface OnlineUser {
    socketId: string;
    user: User;
}

interface UseSocketOptions {
    channelId: string | null;
    currentUser?: User;
}

interface UseSocketReturn {
    connected: boolean;
    connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
    messages: Message[];
    typingUsers: TypingUser[];
    onlineUsers: OnlineUser[];
    sendTyping: (userId: string, name: string) => void;
    addMessage: (message: Message) => void;
    updateMessage: (messageId: string, updates: Partial<Message>) => void;
    removeMessage: (messageId: string) => void;
}

export function useSocket({ channelId, currentUser }: UseSocketOptions): UseSocketReturn {
    const { socket, connected, connectionState } = useSharedSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Register all chat-related event listeners on the shared socket
    useEffect(() => {
        if (!socket) return;

        // Listen for new messages
        const handleNewMessage = (message: Message) => {
            setMessages((prev) => {
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, { ...message, status: 'sent' }];
            });
        };

        // Listen for message edits
        const handleMessageEdited = (data: { messageId: string; content: string; isEdited: boolean; editedAt: string }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === data.messageId
                        ? { ...msg, content: data.content, isEdited: true, editedAt: data.editedAt }
                        : msg
                )
            );
        };

        // Listen for message deletions
        const handleMessageDeleted = (data: { messageId: string }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === data.messageId
                        ? { ...msg, content: "[This message was deleted]", isDeleted: true }
                        : msg
                )
            );
        };

        // Listen for typing indicators
        const handleUserTyping = (data: TypingUser) => {
            setTypingUsers((prev) => {
                if (prev.some((u) => u.userId === data.userId)) return prev;
                return [...prev, data];
            });
            // Auto-remove after 3 seconds
            setTimeout(() => {
                setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
            }, 3000);
        };

        const handleUserStopTyping = (data: { userId: string }) => {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        };

        // Listen for reactions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleReaction = (data: any) => {
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
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (r: any) => !(r.userId === data.userId && r.emoji === data.emoji)
                            ),
                        };
                    }
                })
            );
        };

        // Listen for thread reply count updates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleReplyCountUpdate = (data: { messageId: string; replyCount: number; latestReply: any }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === data.messageId
                        ? { ...msg, replyCount: data.replyCount, replies: [data.latestReply] }
                        : msg
                )
            );
        };

        // Listen for new thread replies
        const handleThreadReply = (message: Message) => {
            setMessages((prev) => {
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, { ...message, status: 'sent' }];
            });
        };

        // Listen for channel presence
        const handleChannelPresence = (data: { users: OnlineUser[] }) => {
            setOnlineUsers(data.users);
        };

        const handleChannelUserJoined = (data: OnlineUser) => {
            setOnlineUsers(prev => [...prev.filter(u => u.socketId !== data.socketId), data]);
        };

        const handleChannelUserLeft = (data: { socketId: string }) => {
            setOnlineUsers(prev => prev.filter(u => u.socketId !== data.socketId));
        };

        socket.on("new-message", handleNewMessage);
        socket.on("message-edited", handleMessageEdited);
        socket.on("message-deleted", handleMessageDeleted);
        socket.on("user-typing", handleUserTyping);
        socket.on("user-stop-typing", handleUserStopTyping);
        socket.on("message-reaction", handleReaction);
        socket.on("reply-count-update", handleReplyCountUpdate);
        socket.on("thread-reply", handleThreadReply);
        socket.on("channel-presence", handleChannelPresence);
        socket.on("channel-user-joined", handleChannelUserJoined);
        socket.on("channel-user-left", handleChannelUserLeft);

        return () => {
            socket.off("new-message", handleNewMessage);
            socket.off("message-edited", handleMessageEdited);
            socket.off("message-deleted", handleMessageDeleted);
            socket.off("user-typing", handleUserTyping);
            socket.off("user-stop-typing", handleUserStopTyping);
            socket.off("message-reaction", handleReaction);
            socket.off("reply-count-update", handleReplyCountUpdate);
            socket.off("thread-reply", handleThreadReply);
            socket.off("channel-presence", handleChannelPresence);
            socket.off("channel-user-joined", handleChannelUserJoined);
            socket.off("channel-user-left", handleChannelUserLeft);
        };
    }, [socket]);

    // Join/leave channel when channelId changes
    useEffect(() => {
        if (!socket || !connected || !channelId) return;

        // Clear state when switching channels
        setMessages([]);
        setTypingUsers([]);
        setOnlineUsers([]);

        // Join with user info for presence if available
        if (currentUser) {
            socket.emit("join-channel", { channelId, user: currentUser });
        } else {
            socket.emit("join-channel", channelId);
        }

        return () => {
            socket.emit("leave-channel", channelId);
        };
    }, [socket, connected, channelId, currentUser]);

    // Rejoin channel on reconnect
    useEffect(() => {
        if (!socket || !channelId) return;

        const handleReconnect = () => {
            if (currentUser) {
                socket.emit("join-channel", { channelId, user: currentUser });
            } else {
                socket.emit("join-channel", channelId);
            }
        };

        socket.on("reconnect", handleReconnect);
        return () => { socket.off("reconnect", handleReconnect); };
    }, [socket, channelId, currentUser]);

    // Send typing indicator (debounced)
    const sendTyping = useCallback(
        (userId: string, name: string) => {
            if (!socket || !channelId || typingTimeoutRef.current) return;

            socket.emit("typing", { channelId, userId, name });

            typingTimeoutRef.current = setTimeout(() => {
                typingTimeoutRef.current = null;
            }, 2000);
        },
        [socket, channelId]
    );

    // Add a message locally (for optimistic updates)
    const addMessage = useCallback((message: Message) => {
        setMessages((prev) => {
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
        });
    }, []);

    // Update a message locally (for edit confirmation or status updates)
    const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
            )
        );
    }, []);

    // Remove a message locally (for failed messages)
    const removeMessage = useCallback((messageId: string) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    }, []);

    return {
        connected,
        connectionState,
        messages,
        typingUsers,
        onlineUsers,
        sendTyping,
        addMessage,
        updateMessage,
        removeMessage,
    };
}
