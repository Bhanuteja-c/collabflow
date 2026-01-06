// src/components/video/VideoChat.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Send, MessageSquare } from "lucide-react";
import { ChatMessage } from "@/hooks/useVideoCall";

interface VideoChatProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onSendMessage: (content: string) => void;
    currentUserId: string;
}

export function VideoChat({ isOpen, onClose, messages, onSendMessage, currentUserId }: VideoChatProps) {
    const [newMessage, setNewMessage] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage(newMessage.trim());
            setNewMessage("");
        }
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="absolute right-0 top-0 bottom-0 w-80 bg-neutral-900 border-l border-neutral-700 flex flex-col z-20"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-neutral-700">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-white">Meeting Chat</h3>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-neutral-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                        <div className="space-y-4">
                            {messages.length === 0 ? (
                                <div className="text-center py-8">
                                    <MessageSquare className="w-10 h-10 mx-auto text-neutral-600 mb-3" />
                                    <p className="text-sm text-neutral-500">No messages yet</p>
                                    <p className="text-xs text-neutral-600 mt-1">Send a message to start the chat</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isOwn = msg.userId === currentUserId;
                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                                        >
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarImage src={msg.userImage} />
                                                <AvatarFallback className="text-xs">
                                                    {msg.userName?.[0]?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className={`text-xs font-medium ${isOwn ? 'text-primary' : 'text-neutral-300'}`}>
                                                        {isOwn ? 'You' : msg.userName}
                                                    </span>
                                                    <span className="text-xs text-neutral-500">
                                                        {formatTime(msg.timestamp)}
                                                    </span>
                                                </div>
                                                <div className={`inline-block px-3 py-2 rounded-lg text-sm ${isOwn
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-neutral-800 text-white'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-4 border-t border-neutral-700">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Type a message..."
                                className="flex-1 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                            />
                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={!newMessage.trim()}
                                className="h-10 w-10"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
