"use strict";
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

interface HostControlsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HostControlsSidebar({ isOpen, onClose }: HostControlsSidebarProps) {
    const [hostManagement, setHostManagement] = useState(true);
    const [shareScreen, setShareScreen] = useState(true);
    const [sendReactions, setSendReactions] = useState(true);
    const [turnOnMicrophone, setTurnOnMicrophone] = useState(true);
    const [turnOnVideo, setTurnOnVideo] = useState(true);

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
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#5f6368]/20">
                        <h3 className="text-base font-medium text-[#e8eaed]">Host controls</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] hover:text-[#e8eaed] transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
                        <p className="text-[13px] text-[#9aa0a6] leading-relaxed">
                            Use these host settings to keep control of your meeting. Only hosts have access to these controls.
                        </p>

                        <div className="space-y-4">
                            <span className="text-xs font-medium text-[#9aa0a6] uppercase tracking-wider">Meeting moderation</span>

                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium text-[#e8eaed]">Host management</h4>
                                    <p className="text-[12px] text-[#9aa0a6] leading-tight">
                                        Lets you restrict what contributors can enable - like Gemini Notes and Recordings if available - and lets you appoint co-hosts. <a href="#" className="text-[#8ab4f8] hover:underline">Learn more</a>
                                    </p>
                                </div>
                                <Switch checked={hostManagement} onCheckedChange={setHostManagement} className="data-[state=checked]:bg-[#8ab4f8]" />
                            </div>
                        </div>

                        <div className="space-y-4 opacity-100 transition-opacity" style={{ opacity: hostManagement ? 1 : 0.5 }}>
                            <span className="text-xs font-medium text-[#9aa0a6] uppercase tracking-wider">Let contributors</span>

                            <div className="flex items-center justify-between gap-4">
                                <h4 className="text-sm text-[#e8eaed]">Share their screen</h4>
                                <Switch checked={shareScreen} onCheckedChange={setShareScreen} disabled={!hostManagement} className="data-[state=checked]:bg-[#8ab4f8]" />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <h4 className="text-sm text-[#e8eaed]">Send reactions</h4>
                                <Switch checked={sendReactions} onCheckedChange={setSendReactions} disabled={!hostManagement} className="data-[state=checked]:bg-[#8ab4f8]" />
                            </div>

                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <h4 className="text-sm text-[#e8eaed]">Turn on their microphone</h4>
                                    <p className="text-[12px] text-[#9aa0a6] leading-tight">
                                        Turning this off might remove people using an outdated Meet app or non-Google meeting hardware. They can rejoin when it's turned on again.
                                    </p>
                                </div>
                                <Switch checked={turnOnMicrophone} onCheckedChange={setTurnOnMicrophone} disabled={!hostManagement} className="data-[state=checked]:bg-[#8ab4f8]" />
                            </div>

                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <h4 className="text-sm text-[#e8eaed]">Turn on their video</h4>
                                    <p className="text-[12px] text-[#9aa0a6] leading-tight">
                                        Turning this off might remove people using an outdated Meet app or non-Google meeting hardware.
                                    </p>
                                </div>
                                <Switch checked={turnOnVideo} onCheckedChange={setTurnOnVideo} disabled={!hostManagement} className="data-[state=checked]:bg-[#8ab4f8]" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
