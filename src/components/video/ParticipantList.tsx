// src/components/video/ParticipantList.tsx — Google Meet "People" panel
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { X, Users, Mic, MicOff, Video, VideoOff, Crown } from "lucide-react";

interface Participant {
    id: string;
    name: string;
    image: string;
    isMuted?: boolean;
    isVideoOff?: boolean;
    isHost?: boolean;
}

interface ParticipantListProps {
    isOpen: boolean;
    onClose: () => void;
    participants: Participant[];
    currentUserId: string;
}

export function ParticipantList({ isOpen, onClose, participants, currentUserId }: ParticipantListProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-[#2d2e30] border-l border-[#5f6368]/30 flex flex-col z-20"
                >
                    {/* Header — Google Meet style */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#5f6368]/20">
                        <h3 className="text-base font-medium text-[#e8eaed]">People ({participants.length})</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] hover:text-[#e8eaed] transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* In-meeting section */}
                    <div className="px-4 py-2">
                        <span className="text-xs font-medium text-[#9aa0a6] uppercase tracking-wider">In this meeting</span>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="px-2 space-y-0.5">
                            {participants.map((participant) => {
                                const isCurrentUser = participant.id === currentUserId;
                                return (
                                    <div
                                        key={participant.id}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#3c4043] transition-colors group"
                                    >
                                        <div className="relative shrink-0">
                                            <UserAvatar user={participant} className="h-8 w-8" showStatus={false} />
                                            {participant.isHost && (
                                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#fdd663] rounded-full flex items-center justify-center border border-[#2d2e30]">
                                                    <Crown className="w-2.5 h-2.5 text-[#202124]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[#e8eaed] truncate">
                                                {participant.name}
                                                {isCurrentUser && (
                                                    <span className="text-[#8ab4f8] ml-1">(You)</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {participant.isMuted && (
                                                <div className="w-6 h-6 rounded-full bg-[#202124]/50 flex items-center justify-center">
                                                    <MicOff className="w-3.5 h-3.5 text-[#ea4335]" />
                                                </div>
                                            )}
                                            {participant.isVideoOff && (
                                                <div className="w-6 h-6 rounded-full bg-[#202124]/50 flex items-center justify-center">
                                                    <VideoOff className="w-3.5 h-3.5 text-[#ea4335]" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
