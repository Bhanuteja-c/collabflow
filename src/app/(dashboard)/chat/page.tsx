// src/app/(dashboard)/chat/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/hooks/useSocket";
import {
    Plus,
    Send,
    Hash,
    Users,
    Loader2,
    MessageSquare,
    Smile,
    X,
    Menu,
} from "lucide-react";

interface User {
    id: string;
    name: string | null;
    image: string | null;
}

interface Message {
    id: string;
    content: string;
    createdAt: string;
    author: User;
    reactions?: any[];
    attachments?: any;
}

interface ChannelMember {
    user: User;
    role: string;
}

interface Channel {
    id: string;
    name: string;
    type: string;
    members: ChannelMember[];
}

const EMOJI_LIST = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "💯", "✅"];

export default function ChatPage() {
    const { data: session } = useSession();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [fetchedMessages, setFetchedMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Socket.io hook
    const { connected, messages: socketMessages, typingUsers, sendTyping } = useSocket(
        selectedChannel?.id || null
    );

    // Combine fetched messages with socket messages
    const allMessages = [...fetchedMessages, ...socketMessages];

    // Fetch channels
    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const res = await fetch("/api/channels");
                if (res.ok) {
                    const data = await res.json();
                    setChannels(data);
                    if (data.length > 0 && !selectedChannel) {
                        setSelectedChannel(data[0]);
                    }
                }
            } catch (error) {
                console.error("Error fetching channels:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchChannels();
    }, []);

    // Fetch messages when channel changes
    useEffect(() => {
        if (!selectedChannel) return;

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/messages?channelId=${selectedChannel.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setFetchedMessages(data);
                }
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
        };
        fetchMessages();
    }, [selectedChannel]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [allMessages, typingUsers]);

    const createChannel = async () => {
        if (!newChannelName.trim()) return;

        try {
            const res = await fetch("/api/channels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newChannelName.trim() }),
            });

            if (res.ok) {
                const channel = await res.json();
                setChannels([channel, ...channels]);
                setSelectedChannel(channel);
                setNewChannelName("");
                setShowNewChannel(false);
            }
        } catch (error) {
            console.error("Error creating channel:", error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChannel || sending) return;

        setSending(true);
        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    channelId: selectedChannel.id,
                    content: newMessage.trim(),
                }),
            });

            if (res.ok) {
                setNewMessage("");
                setShowEmojiPicker(false);
            }
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
        }
    };

    const handleTyping = () => {
        if (session?.user) {
            sendTyping((session.user as any).id || "", session.user.name || "");
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return (
            date.toLocaleDateString([], { month: "short", day: "numeric" }) +
            " " +
            date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
    };

    const addEmoji = (emoji: string) => {
        setNewMessage((prev) => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-3.5rem)] bg-background items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading chat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-3.5rem)] bg-background">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Channel List */}
            <div
                className={`
                fixed md:relative inset-y-0 left-0 z-50 md:z-auto
                w-72 md:w-64 border-r flex flex-col bg-muted/30
                transform transition-transform duration-200 ease-in-out
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}
            >
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <h2 className="font-semibold text-lg">Channels</h2>
                            {connected && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowNewChannel(!showNewChannel)}
                            className="h-8 w-8"
                        >
                            {showNewChannel ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </Button>
                    </div>

                    <AnimatePresence>
                        {showNewChannel && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2"
                            >
                                <Input
                                    placeholder="Channel name"
                                    value={newChannelName}
                                    onChange={(e) => setNewChannelName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && createChannel()}
                                    className="h-9"
                                    autoFocus
                                />
                                <Button onClick={createChannel} className="w-full h-9" size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Channel
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {channels.length === 0 ? (
                            <div className="text-center py-8 px-4">
                                <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">No channels yet</p>
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => setShowNewChannel(true)}
                                    className="mt-2"
                                >
                                    Create your first channel
                                </Button>
                            </div>
                        ) : (
                            channels.map((channel) => (
                                <button
                                    key={channel.id}
                                    onClick={() => {
                                        setSelectedChannel(channel);
                                        setSidebarOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${selectedChannel?.id === channel.id
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <Hash className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate text-sm font-medium">{channel.name}</span>
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedChannel ? (
                    <>
                        {/* Channel Header */}
                        <div className="p-4 border-b flex items-center justify-between bg-background/80 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden h-9 w-9"
                                    onClick={() => setSidebarOpen(true)}
                                >
                                    <Menu className="w-5 h-5" />
                                </Button>
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Hash className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h1 className="font-semibold">{selectedChannel.name}</h1>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedChannel.members?.length || 0} members
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Users className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-1">
                                {allMessages.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                            <MessageSquare className="w-8 h-8 text-primary" />
                                        </div>
                                        <h3 className="font-medium text-lg mb-1">
                                            Welcome to #{selectedChannel.name}
                                        </h3>
                                        <p className="text-muted-foreground text-sm">
                                            This is the beginning of the channel. Say hi!
                                        </p>
                                    </div>
                                ) : (
                                    allMessages.map((message, i) => {
                                        const prevMessage = allMessages[i - 1];
                                        const showAvatar =
                                            i === 0 || prevMessage?.author.id !== message.author.id;

                                        return (
                                            <motion.div
                                                key={message.id}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex gap-3 group hover:bg-muted/50 rounded-lg px-2 py-1 -mx-2 ${showAvatar ? "mt-4" : ""
                                                    }`}
                                            >
                                                {showAvatar ? (
                                                    <Avatar className="h-9 w-9 mt-0.5">
                                                        <AvatarImage src={message.author.image || ""} />
                                                        <AvatarFallback className="text-xs">
                                                            {message.author.name?.[0]?.toUpperCase() || "?"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ) : (
                                                    <div className="w-9" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    {showAvatar && (
                                                        <div className="flex items-baseline gap-2 mb-0.5">
                                                            <span className="font-semibold text-sm">
                                                                {message.author.name}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatTime(message.createdAt)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <p className="text-sm leading-relaxed break-words">
                                                        {message.content}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}

                                {/* Typing indicator */}
                                {typingUsers.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                                            <span
                                                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                                style={{ animationDelay: "0.1s" }}
                                            />
                                            <span
                                                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                                style={{ animationDelay: "0.2s" }}
                                            />
                                        </div>
                                        <span>
                                            {typingUsers.map((u) => u.name).join(", ")}{" "}
                                            {typingUsers.length === 1 ? "is" : "are"} typing...
                                        </span>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Message Input */}
                        <div className="p-4 border-t">
                            <div className="flex items-center gap-2 relative">
                                {/* Emoji picker */}
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    >
                                        <Smile className="w-5 h-5" />
                                    </Button>
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-12 left-0 bg-popover border rounded-lg shadow-lg p-2 flex gap-1 z-50">
                                            {EMOJI_LIST.map((emoji) => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => addEmoji(emoji)}
                                                    className="hover:bg-muted p-1 rounded text-lg"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Input
                                    ref={inputRef}
                                    placeholder={`Message #${selectedChannel.name}`}
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        handleTyping();
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                    className="flex-1"
                                />

                                <Button
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim() || sending}
                                    size="icon"
                                    className="h-9 w-9"
                                >
                                    {sending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h2 className="font-semibold text-lg mb-2">No channel selected</h2>
                            <p className="text-muted-foreground text-sm">
                                Select a channel or create a new one
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
