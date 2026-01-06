// src/components/video/ParticipantList.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
                    className="absolute right-0 top-0 bottom-0 w-72 bg-neutral-900 border-l border-neutral-700 flex flex-col z-20"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-neutral-700">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-white">
                                Participants ({participants.length})
                            </h3>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-neutral-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Participant List */}
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {participants.map((participant) => {
                                const isCurrentUser = participant.id === currentUserId;
                                return (
                                    <motion.div
                                        key={participant.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800/50 transition-colors"
                                    >
                                        <div className="relative">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={participant.image} />
                                                <AvatarFallback className="bg-primary/20 text-primary">
                                                    {participant.name?.[0]?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {participant.isHost && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                                                    <Crown className="w-3 h-3 text-yellow-900" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">
                                                {participant.name}
                                                {isCurrentUser && (
                                                    <span className="text-primary ml-1">(You)</span>
                                                )}
                                            </p>
                                            {participant.isHost && (
                                                <p className="text-xs text-neutral-500">Host</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {participant.isMuted ? (
                                                <MicOff className="w-4 h-4 text-red-500" />
                                            ) : (
                                                <Mic className="w-4 h-4 text-neutral-400" />
                                            )}
                                            {participant.isVideoOff ? (
                                                <VideoOff className="w-4 h-4 text-red-500" />
                                            ) : (
                                                <Video className="w-4 h-4 text-neutral-400" />
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
