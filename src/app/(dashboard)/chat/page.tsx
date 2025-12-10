// src/app/(dashboard)/chat/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PresenceChannel } from "pusher-js"; // Import type
import {
    Plus,
    Send,
    Hash,
    Users,
    Loader2,
    MessageSquare,
    Smile,
    UserPlus,
    Settings,
    X,
    Search,
    Paperclip,
    Image as ImageIcon,
    MessageCircle,
    Menu,
    AlertCircle
} from "lucide-react";
import { getPusherClient } from "@/lib/pusher";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

interface User {
    id: string;
    name: string | null;
    email?: string | null;
    image: string | null;
}

interface Message {
    id: string;
    content: string;
    createdAt: string;
    author: User;
    reactions?: Reaction[];
    attachments?: any; // JSON
}

interface Reaction {
    id: string;
    emoji: string;
    userId: string;
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
    messages: Message[];
}

const EMOJI_LIST = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "💯", "✅"];

export default function ChatPage() {
    const { data: session } = useSession();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMemberPanel, setShowMemberPanel] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar
    const [error, setError] = useState<string | null>(null);

    // Advanced features state
    const [onlineMembers, setOnlineMembers] = useState<string[]>([]); // User IDs
    const [typingUsers, setTypingUsers] = useState<string[]>([]); // User names
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // DM state
    const [conversations, setConversations] = useState<any[]>([]);
    const [showNewDMDialog, setShowNewDMDialog] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [startingDM, setStartingDM] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

        // Also fetch DM conversations
        const fetchConversations = async () => {
            try {
                const res = await fetch("/api/conversations");
                if (res.ok) {
                    setConversations(await res.json());
                }
            } catch (e) {
                console.error("Error fetching conversations:", e);
            }
        };
        fetchConversations();
    }, []);

    // Fetch messages when channel changes
    useEffect(() => {
        if (!selectedChannel) return;

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/messages?channelId=${selectedChannel.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data);
                }
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
        };
        fetchMessages();
        setShowMemberPanel(false);
        setTypingUsers([]);
    }, [selectedChannel]);

    // Subscribe to Pusher (Presence Channel)
    useEffect(() => {
        if (!selectedChannel || !session?.user) return;

        const pusher = getPusherClient();
        // Using presence channel for online status
        const channelName = `presence-channel-${selectedChannel.id}`;
        const channel = pusher.subscribe(channelName) as PresenceChannel;

        channel.bind("new-message", (message: Message) => {
            setMessages((prev) => [...prev, message]);
        });

        // Valid subscription
        channel.bind("pusher:subscription_succeeded", (members: any) => {
            const memberIds: string[] = [];
            members.each((member: any) => memberIds.push(member.id));
            setOnlineMembers(memberIds);
        });

        // Member added
        channel.bind("pusher:member_added", (member: any) => {
            setOnlineMembers((prev) => [...prev, member.id]);
        });

        // Member removed
        channel.bind("pusher:member_removed", (member: any) => {
            setOnlineMembers((prev) => prev.filter((id) => id !== member.id));
        });

        // Client events for typing
        channel.bind("client-typing", (data: { userId: string, name: string }) => {
            if (!session?.user) return;
            const currentUserId = (session.user as any).id || session.user.image; // fallback
            if (data.userId === currentUserId) return; // Don't show own typing

            setTypingUsers((prev) => {
                if (!prev.includes(data.name)) return [...prev, data.name];
                return prev;
            });

            // Clear after 3 seconds
            setTimeout(() => {
                setTypingUsers((prev) => prev.filter((name) => name !== data.name));
            }, 3000);
        });

        // Handle reactions
        channel.bind("message-reaction", (data: any) => {
            setMessages((prev) => prev.map((msg) => {
                if (msg.id !== data.messageId) return msg;

                const reactions = msg.reactions || [];
                if (data.action === "added") {
                    return {
                        ...msg,
                        reactions: [...reactions, { id: data.id, emoji: data.emoji, userId: data.userId }]
                    };
                } else {
                    return {
                        ...msg,
                        reactions: reactions.filter((r) =>
                            !(r.userId === data.userId && r.emoji === data.emoji)
                        )
                    };
                }
            }));
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(channelName);
        };
    }, [selectedChannel, session]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typingUsers]);

    const toggleReaction = async (messageId: string, emoji: string) => {
        try {
            await fetch("/api/reactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageId, emoji }),
            });
        } catch (error) {
            console.error("Error toggling reaction:", error);
        }
    };

    const handleTyping = () => {
        if (!selectedChannel || !session?.user) return;

        // Throttle typing events
        if (typingTimeoutRef.current) return;

        const pusher = getPusherClient();
        const channel = pusher.channel(`presence-channel-${selectedChannel.id}`);

        // Trigger client event
        channel?.trigger("client-typing", {
            userId: (session.user as any).id,
            name: session.user.name
        });

        typingTimeoutRef.current = setTimeout(() => {
            typingTimeoutRef.current = null;
        }, 2000);
    };

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
        setError(null);
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
            } else {
                const data = await res.json();
                setError(data.error || "Failed to send message");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setError("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const inviteMember = async () => {
        if (!inviteEmail.trim() || !selectedChannel || inviting) return;

        setInviting(true);
        try {
            const res = await fetch(`/api/channels/${selectedChannel.id}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail.trim() }),
            });

            const data = await res.json();
            if (data.error) {
                alert(data.error);
            } else {
                setSelectedChannel({
                    ...selectedChannel,
                    members: [...selectedChannel.members, { user: data.user, role: "member" }],
                });
                setInviteEmail("");
                alert("Member added successfully!");
            }
        } catch (error) {
            console.error("Error inviting member:", error);
            alert("Failed to invite member");
        } finally {
            setInviting(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return date.toLocaleDateString([], { month: "short", day: "numeric" }) +
            " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const addEmoji = (emoji: string) => {
        setNewMessage((prev) => prev + emoji);
        inputRef.current?.focus();
    };


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Convert to Base64
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;

            // Send message with attachment
            setSending(true);
            try {
                const res = await fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        channelId: selectedChannel?.id,
                        content: "Sent an attachment",
                        attachments: [{ type: "image", url: base64, name: file.name }],
                    }),
                });

                if (res.ok) {
                    setShowEmojiPicker(false);
                }
            } catch (error) {
                console.error("Error uploading file:", error);
                alert("Failed to upload file");
            } finally {
                setSending(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // DM functions
    const fetchUsers = async (query: string = "") => {
        try {
            const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                setAllUsers(await res.json());
            }
        } catch (e) {
            console.error("Error fetching users:", e);
        }
    };

    const startDM = async (userId: string) => {
        setStartingDM(true);
        try {
            const res = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId })
            });
            if (res.ok) {
                const data = await res.json();
                // Find or create a channel-like object for the DM
                const dmChannel: Channel = {
                    id: data.id,
                    name: data.otherUser?.name || "Direct Message",
                    type: "direct",
                    members: [],
                    messages: []
                };
                setSelectedChannel(dmChannel);
                setShowNewDMDialog(false);
                // Refresh conversations
                const convRes = await fetch("/api/conversations");
                if (convRes.ok) setConversations(await convRes.json());
            }
        } catch (e) {
            console.error("Error starting DM:", e);
        } finally {
            setStartingDM(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-3.5rem)] bg-background">
                {/* Sidebar skeleton */}
                <div className="hidden md:flex w-64 border-r flex-col bg-muted/30 animate-pulse">
                    <div className="p-4 space-y-3">
                        <div className="h-6 bg-muted rounded w-24" />
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded" />)}
                        </div>
                    </div>
                </div>
                {/* Main content skeleton */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Loading chat...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-3.5rem)] bg-background">
            {/* Error Banner */}
            {error && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-2">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Channel List */}
            <div className={`
                fixed md:relative inset-y-0 left-0 z-50 md:z-auto
                w-72 md:w-64 border-r flex flex-col bg-muted/30
                transform transition-transform duration-200 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-lg">Channels</h2>
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
                                    onClick={() => setSelectedChannel(channel)}
                                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${selectedChannel?.id === channel.id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <Hash className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate text-sm font-medium">{channel.name}</span>
                                    {channel.messages[0] && (
                                        <span className="ml-auto text-xs opacity-60">
                                            {channel.members.length}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* Direct Messages Section */}
                <div className="p-3 border-t">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Direct Messages
                        </h3>
                        <Dialog open={showNewDMDialog} onOpenChange={(open) => {
                            setShowNewDMDialog(open);
                            if (open) fetchUsers();
                        }}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>New Message</DialogTitle>
                                    <DialogDescription>Start a conversation with someone</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Input
                                        placeholder="Search users..."
                                        value={userSearchQuery}
                                        onChange={(e) => {
                                            setUserSearchQuery(e.target.value);
                                            fetchUsers(e.target.value);
                                        }}
                                    />
                                    <ScrollArea className="h-64">
                                        <div className="space-y-1">
                                            {allUsers.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-4">
                                                    No users found
                                                </p>
                                            ) : (
                                                allUsers.map((user) => (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => startDM(user.id)}
                                                        disabled={startingDM}
                                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                                                    >
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={user.image || ""} />
                                                            <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium">{user.name}</p>
                                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="space-y-1">
                        {conversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => {
                                    const dmChannel: Channel = {
                                        id: conv.id,
                                        name: conv.otherUser?.name || "Unknown",
                                        type: "direct",
                                        members: [],
                                        messages: []
                                    };
                                    setSelectedChannel(dmChannel);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${selectedChannel?.id === conv.id
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={conv.otherUser?.image || ""} />
                                    <AvatarFallback className="text-xs">{conv.otherUser?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm font-medium">{conv.otherUser?.name}</span>
                                {conv.lastMessage && (
                                    <span className="ml-auto text-xs opacity-60 truncate max-w-16">
                                        {conv.lastMessage.content.substring(0, 10)}...
                                    </span>
                                )}
                            </button>
                        ))}
                        {conversations.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">No conversations yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedChannel ? (
                    <>
                        {/* Channel Header */}
                        <div className="p-4 border-b flex items-center justify-between bg-background/80 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                {/* Mobile menu button */}
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
                                        {selectedChannel.members.length} member{selectedChannel.members.length > 1 ? "s" : ""}
                                        {onlineMembers.length > 0 && ` • ${onlineMembers.length} online`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={showMemberPanel ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={() => setShowMemberPanel(!showMemberPanel)}
                                    className="h-9 w-9"
                                >
                                    <Users className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Messages */}
                            <div className="flex-1 flex flex-col">
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-1">
                                        {messages.length === 0 ? (
                                            <div className="text-center py-16">
                                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                    <MessageSquare className="w-8 h-8 text-primary" />
                                                </div>
                                                <h3 className="font-medium text-lg mb-1">Welcome to #{selectedChannel.name}</h3>
                                                <p className="text-muted-foreground text-sm">
                                                    This is the beginning of the channel. Say hi! 👋
                                                </p>
                                            </div>
                                        ) : (
                                            messages.map((message, i) => {
                                                const prevMessage = messages[i - 1];
                                                const showAvatar = i === 0 || prevMessage?.author.id !== message.author.id;
                                                const showDate = i === 0 ||
                                                    (prevMessage && new Date(prevMessage.createdAt).toDateString() !==
                                                        new Date(message.createdAt).toDateString());

                                                return (
                                                    <div key={message.id}>
                                                        {showDate && (
                                                            <div className="flex items-center gap-4 my-4">
                                                                <div className="flex-1 h-px bg-border" />
                                                                <span className="text-xs text-muted-foreground font-medium">
                                                                    {new Date(message.createdAt).toLocaleDateString([], {
                                                                        weekday: "long", month: "short", day: "numeric"
                                                                    })}
                                                                </span>
                                                                <div className="flex-1 h-px bg-border" />
                                                            </div>
                                                        )}
                                                        <motion.div
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
                                                                <div className="w-9 flex items-center justify-center">
                                                                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        {new Date(message.createdAt).toLocaleTimeString([], {
                                                                            hour: "2-digit", minute: "2-digit"
                                                                        })}
                                                                    </span>
                                                                </div>
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

                                                                {/* Message Content */}
                                                                <div className="space-y-2">
                                                                    {message.content && <p className="text-sm leading-relaxed break-words">{message.content}</p>}

                                                                    {/* Attachments */}
                                                                    {message.attachments && (message.attachments as any[]).map((att: any, idx: number) => (
                                                                        <div key={idx} className="mt-2">
                                                                            {att.type === "image" && (
                                                                                <img
                                                                                    src={att.url}
                                                                                    alt="attachment"
                                                                                    className="max-w-sm rounded-lg border max-h-60 object-cover"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Reactions */}
                                                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                                    {(() => {
                                                                        const reactionCounts = (message.reactions || []).reduce((acc: any, r: Reaction) => {
                                                                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                                            return acc;
                                                                        }, {});

                                                                        return Object.entries(reactionCounts).map(([emoji, count]) => {
                                                                            const hasReacted = message.reactions?.some(r => r.emoji === emoji && r.userId === (session?.user as any).id);
                                                                            return (
                                                                                <button
                                                                                    key={emoji}
                                                                                    onClick={() => toggleReaction(message.id, emoji)}
                                                                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors border ${hasReacted
                                                                                        ? "bg-primary/10 border-primary/30 text-primary"
                                                                                        : "bg-muted/50 border-transparent hover:border-border"
                                                                                        }`}
                                                                                >
                                                                                    <span>{emoji}</span>
                                                                                    <span className="font-medium">{count as number}</span>
                                                                                </button>
                                                                            );
                                                                        });
                                                                    })()}

                                                                    {/* Add Reaction Button */}
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 rounded-full"
                                                                            onClick={() => {
                                                                                // For simplicity, just adding a thumbs up via this quick button
                                                                                // Ideally opening a popover
                                                                                toggleReaction(message.id, "👍");
                                                                            }}
                                                                        >
                                                                            <Smile className="w-3 h-3 text-muted-foreground" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </div>
                                                );
                                            })
                                        )}

                                        {/* Typing Indicator */}
                                        {typingUsers.length > 0 && (
                                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground animate-pulse ml-11">
                                                <span>
                                                    {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                                                </span>
                                            </div>
                                        )}

                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>

                                {/* Message Input */}
                                <div className="p-4 border-t bg-background">
                                    <div className="relative">
                                        {/* File Input (Hidden) */}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id="file-upload"
                                            onChange={handleFileUpload}
                                        />

                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                                                    onClick={() => document.getElementById("file-upload")?.click()}
                                                >
                                                    <Paperclip className="w-5 h-5" />
                                                </Button>
                                            </div>
                                            <div className="relative flex-1">
                                                <Input
                                                    ref={inputRef}
                                                    placeholder={`Message #${selectedChannel.name}`}
                                                    value={newMessage}
                                                    onChange={(e) => {
                                                        setNewMessage(e.target.value);
                                                        handleTyping();
                                                    }}
                                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                                    disabled={sending}
                                                    className="pr-12"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                >
                                                    <Smile className="w-4 h-4 text-muted-foreground" />
                                                </Button>
                                            </div>
                                            <Button
                                                onClick={sendMessage}
                                                disabled={sending || !newMessage.trim()}
                                                className="px-4"
                                            >
                                                {sending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>

                                        {/* Emoji Picker */}
                                        <AnimatePresence>
                                            {showEmojiPicker && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute bottom-full mb-2 right-0 bg-popover border rounded-lg shadow-lg p-2"
                                                >
                                                    <div className="flex gap-1">
                                                        {EMOJI_LIST.map((emoji) => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => addEmoji(emoji)}
                                                                className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded text-lg transition-colors"
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Members Panel */}
                            <AnimatePresence>
                                {showMemberPanel && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 280, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="border-l bg-muted/30 overflow-hidden"
                                    >
                                        <div className="p-4 w-[280px]">
                                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                Members ({selectedChannel.members.length})
                                            </h3>

                                            {/* Invite Section */}
                                            <div className="mb-4 p-3 bg-background rounded-lg border">
                                                <p className="text-xs text-muted-foreground mb-2">Invite by email</p>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="email@example.com"
                                                        value={inviteEmail}
                                                        onChange={(e) => setInviteEmail(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && inviteMember()}
                                                        className="h-8 text-sm"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={inviteMember}
                                                        disabled={inviting || !inviteEmail.trim()}
                                                        className="h-8"
                                                    >
                                                        {inviting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Member List */}
                                            <div className="space-y-2">
                                                {selectedChannel.members.map((member) => (
                                                    <div
                                                        key={member.user.id}
                                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                                                    >
                                                        <div className="relative">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={member.user.image || ""} />
                                                                <AvatarFallback className="text-xs">
                                                                    {member.user.name?.[0]?.toUpperCase() || "?"}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            {/* Online Status Dot */}
                                                            {onlineMembers.includes(member.user.id) && (
                                                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{member.user.name}</p>
                                                            {member.role === "admin" && (
                                                                <span className="text-xs text-primary">Admin</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-sm">
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                                <MessageSquare className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="font-semibold text-xl mb-2">Welcome to Chat</h2>
                            <p className="text-muted-foreground mb-6">
                                Create a channel to start collaborating with your team in real-time.
                            </p>
                            <Button onClick={() => setShowNewChannel(true)} size="lg">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Channel
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
