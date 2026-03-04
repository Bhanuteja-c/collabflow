// src/components/video/VideoChat.tsx — Google Meet "In-call messages" panel
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    }, [isOpen]);

    const handleSend = () => {
        if (newMessage.trim()) { onSendMessage(newMessage.trim()); setNewMessage(""); }
    };

    const formatTime = (date: Date) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-[#2d2e30] border-l border-[#5f6368]/30 flex flex-col z-20"
                >
                    {/* Header — Google Meet style */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#5f6368]/20">
                        <h3 className="text-base font-medium text-[#e8eaed]">In-call messages</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] hover:text-[#e8eaed] transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Info notice */}
                    {messages.length === 0 && (
                        <div className="px-4 py-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-[#3c4043] flex items-center justify-center mx-auto mb-3">
                                <MessageSquare className="w-6 h-6 text-[#9aa0a6]" />
                            </div>
                            <p className="text-[13px] text-[#9aa0a6] leading-relaxed">
                                Messages can only be seen by people in the call and are deleted when the call ends.
                            </p>
                        </div>
                    )}

                    {/* Messages */}
                    <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                        <div className="space-y-3 py-2">
                            {messages.map((msg) => {
                                const isOwn = msg.userId === currentUserId;
                                return (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                            <span className="text-[13px] font-medium text-[#e8eaed]">
                                                {isOwn ? "You" : msg.userName}
                                            </span>
                                            <span className="text-[11px] text-[#9aa0a6]">
                                                {formatTime(msg.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-[#bdc1c6] leading-relaxed">
                                            {msg.content}
                                        </p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    {/* Input — Google Meet style */}
                    <div className="px-4 py-3 border-t border-[#5f6368]/20">
                        <div className="flex items-center gap-2 bg-[#3c4043] rounded-full px-4 py-1">
                            <input
                                ref={inputRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Send a message"
                                className="flex-1 bg-transparent text-[13px] text-[#e8eaed] placeholder:text-[#9aa0a6] outline-none py-2"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!newMessage.trim()}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[#8ab4f8] hover:bg-[#4a4d51] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
