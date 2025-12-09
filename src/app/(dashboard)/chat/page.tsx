// src/app/(dashboard)/chat/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Send,
    Hash,
    Plus,
    Search,
    MoreHorizontal,
    Smile,
    Paperclip,
    Users,
    X,
    FileText,
    Image as ImageIcon,
    File,
} from "lucide-react";

// Types
interface Attachment {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
}

interface Message {
    id: string;
    content: string;
    userId: string;
    userName: string;
    userImage?: string;
    createdAt: Date;
    attachments?: Attachment[];
}

interface Channel {
    id: string;
    name: string;
    unread: number;
}

// Emoji categories
const emojiCategories = {
    "Smileys": ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😋", "😛", "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "😮", "😯", "😲", "😳", "🥺", "😢", "😭", "😤", "😠"],
    "Gestures": ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏"],
    "Objects": ["💻", "📱", "📧", "📎", "📁", "📂", "📅", "📆", "🗓️", "📌", "📍", "✏️", "✒️", "🖊️", "🖋️", "📝", "💼", "📊", "📈", "📉", "🔒", "🔓", "🔑", "🔨", "🛠️", "⚙️", "🔧", "💡", "📷", "🎥"],
    "Symbols": ["✅", "❌", "❓", "❗", "💯", "🔥", "⭐", "✨", "💫", "🎉", "🎊", "🏆", "🥇", "🎯", "💪", "🚀", "⚡", "💥", "💢", "💬", "💭", "🗨️", "♥️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍"],
};

// Demo data
const demoChannels: Channel[] = [
    { id: "general", name: "general", unread: 0 },
    { id: "project-updates", name: "project-updates", unread: 0 },
    { id: "design", name: "design", unread: 0 },
    { id: "development", name: "development", unread: 0 },
    { id: "random", name: "random", unread: 0 },
];

const demoMessages: Message[] = [
    {
        id: "1",
        content: "Hey everyone! 👋 Welcome to the CollabFlow chat!",
        userId: "1",
        userName: "Alex Chen",
        userImage: "",
        createdAt: new Date(Date.now() - 3600000 * 2),
    },
    {
        id: "2",
        content: "Thanks for setting this up. The new Kanban board looks great!",
        userId: "2",
        userName: "Sarah Miller",
        userImage: "",
        createdAt: new Date(Date.now() - 3600000),
    },
    {
        id: "3",
        content: "Agreed! The drag-and-drop is super smooth. Great work team! 🚀",
        userId: "3",
        userName: "Mike Johnson",
        userImage: "",
        createdAt: new Date(Date.now() - 1800000),
    },
    {
        id: "4",
        content: "Let's sync up tomorrow to discuss the video conferencing integration.",
        userId: "1",
        userName: "Alex Chen",
        userImage: "",
        createdAt: new Date(Date.now() - 900000),
    },
];

export default function ChatPage() {
    const { data: session } = useSession();
    const [channels] = useState<Channel[]>(demoChannels);
    const [activeChannel, setActiveChannel] = useState<Channel>(demoChannels[0]);
    const [messages, setMessages] = useState<Message[]>(demoMessages);
    const [newMessage, setNewMessage] = useState("");
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [activeEmojiCategory, setActiveEmojiCategory] = useState("Smileys");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = () => {
        if (!newMessage.trim() && attachments.length === 0) return;
        if (!session?.user) return;

        const message: Message = {
            id: `msg-${Date.now()}`,
            content: newMessage,
            userId: session.user.id || "user",
            userName: session.user.name || "You",
            userImage: session.user.image || "",
            createdAt: new Date(),
            attachments: attachments.length > 0 ? [...attachments] : undefined,
        };

        setMessages([...messages, message]);
        setNewMessage("");
        setAttachments([]);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newAttachments: Attachment[] = Array.from(files).map((file) => ({
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            url: URL.createObjectURL(file),
        }));

        setAttachments([...attachments, ...newAttachments]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments(attachments.filter((a) => a.id !== id));
    };

    const insertEmoji = (emoji: string) => {
        setNewMessage((prev) => prev + emoji);
        setShowEmojiPicker(false);
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        }).format(date);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
        if (type.includes("pdf") || type.includes("document")) return <FileText className="w-4 h-4" />;
        return <File className="w-4 h-4" />;
    };

    return (
        <div className="flex h-[calc(100vh-3.5rem)] bg-background">
            {/* Channels Sidebar */}
            <div className="w-64 border-r flex flex-col bg-muted/30">
                {/* Channel Header */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-foreground">Channels</h2>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search channels..."
                            className="pl-8 h-8 text-sm"
                        />
                    </div>
                </div>

                {/* Channel List */}
                <ScrollArea className="flex-1 p-2">
                    {channels.map((channel) => (
                        <button
                            key={channel.id}
                            onClick={() => setActiveChannel(channel)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeChannel.id === channel.id
                                    ? "bg-secondary text-foreground"
                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                }`}
                        >
                            <Hash className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{channel.name}</span>
                            {channel.unread > 0 && (
                                <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                                    {channel.unread}
                                </span>
                            )}
                        </button>
                    ))}
                </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className="h-14 border-b flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <Hash className="w-5 h-5 text-muted-foreground" />
                        <h2 className="font-semibold text-foreground">{activeChannel.name}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Users className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                    <AnimatePresence initial={false}>
                        {messages.map((message, index) => {
                            const showAvatar =
                                index === 0 || messages[index - 1].userId !== message.userId;

                            return (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`flex gap-3 mb-4 ${showAvatar ? "mt-4" : "mt-1"}`}
                                >
                                    {showAvatar ? (
                                        <Avatar className="h-9 w-9 flex-shrink-0">
                                            <AvatarImage src={message.userImage} />
                                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                                {message.userName[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <div className="w-9 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        {showAvatar && (
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="font-medium text-sm text-foreground">
                                                    {message.userName}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatTime(message.createdAt)}
                                                </span>
                                            </div>
                                        )}
                                        <p className="text-sm text-foreground leading-relaxed">
                                            {message.content}
                                        </p>
                                        {/* Attachments */}
                                        {message.attachments && message.attachments.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {message.attachments.map((attachment) => (
                                                    <div
                                                        key={attachment.id}
                                                        className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2"
                                                    >
                                                        {attachment.type.startsWith("image/") ? (
                                                            <img
                                                                src={attachment.url}
                                                                alt={attachment.name}
                                                                className="max-w-xs max-h-48 rounded"
                                                            />
                                                        ) : (
                                                            <>
                                                                {getFileIcon(attachment.type)}
                                                                <span className="text-sm">{attachment.name}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    ({formatFileSize(attachment.size)})
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="px-4 py-2 border-t bg-muted/50">
                        <div className="flex flex-wrap gap-2">
                            {attachments.map((attachment) => (
                                <div
                                    key={attachment.id}
                                    className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border"
                                >
                                    {getFileIcon(attachment.type)}
                                    <span className="text-sm max-w-[150px] truncate">
                                        {attachment.name}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        onClick={() => removeAttachment(attachment.id)}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message Input */}
                <div className="p-4 border-t">
                    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                        {/* File Upload */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Paperclip className="w-4 h-4" />
                        </Button>

                        {/* Input */}
                        <Input
                            placeholder={`Message #${activeChannel.name}`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                            className="border-0 bg-transparent focus-visible:ring-0 px-0"
                        />

                        {/* Emoji Picker */}
                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                    <Smile className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="end">
                                <div className="p-2 border-b">
                                    <div className="flex gap-1 flex-wrap">
                                        {Object.keys(emojiCategories).map((category) => (
                                            <Button
                                                key={category}
                                                variant={activeEmojiCategory === category ? "secondary" : "ghost"}
                                                size="sm"
                                                className="text-xs px-2 py-1 h-7"
                                                onClick={() => setActiveEmojiCategory(category)}
                                            >
                                                {category}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                                    {emojiCategories[activeEmojiCategory as keyof typeof emojiCategories].map((emoji, i) => (
                                        <button
                                            key={i}
                                            onClick={() => insertEmoji(emoji)}
                                            className="text-xl hover:bg-muted rounded p-1 transition-colors"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Send Button */}
                        <Button
                            size="icon"
                            className="h-8 w-8 flex-shrink-0 btn-primary"
                            onClick={sendMessage}
                            disabled={!newMessage.trim() && attachments.length === 0}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 px-1">
                        Press Enter to send • Attach files with 📎 • Add emojis with 😊
                    </p>
                </div>
            </div>
        </div>
    );
}
