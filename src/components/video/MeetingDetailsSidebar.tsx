"use strict";
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MeetingDetailsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    joinUrl: string;
    roomId: string;
}

export function MeetingDetailsSidebar({ isOpen, onClose, joinUrl, roomId }: MeetingDetailsSidebarProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(joinUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

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
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <h3 className="text-base font-medium text-[#e8eaed]">Meeting details</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] hover:text-[#e8eaed] transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-6">
                        {/* Joining Info Card */}
                        <div className="flex flex-col gap-2">
                            <h4 className="text-sm font-medium text-[#e8eaed]">Joining info</h4>
                            <div className="text-[13px] text-[#9aa0a6] break-all">
                                {joinUrl}
                            </div>
                            <div className="text-[13px] text-[#9aa0a6] mt-1 space-y-0.5">
                                <p>Dial-in: Unavailable for testing</p>
                                <p>PIN: {roomId}</p>
                            </div>

                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-2 text-[#8ab4f8] hover:bg-[#8ab4f8]/10 w-fit px-2 py-1.5 -ml-2 rounded-md transition-colors mt-2"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                <span className="text-sm font-medium">{copied ? "Copied" : "Copy joining info"}</span>
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="h-px w-full bg-[#5f6368]/30" />

                        {/* Bottom Info text */}
                        <p className="text-[13px] text-[#9aa0a6]">
                            Google Calendar attachments show up here
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
