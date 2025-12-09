// src/app/(dashboard)/video/page.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Video,
    Monitor,
    Settings,
    Copy,
    Check,
    Plus,
    ExternalLink,
    Users,
} from "lucide-react";

export default function VideoCallPage() {
    const { data: session } = useSession();
    const [roomName, setRoomName] = useState("");
    const [copied, setCopied] = useState(false);
    const [lastRoom, setLastRoom] = useState("");

    // Recent rooms (demo data)
    const recentRooms = [
        { id: "1", name: "Team Standup", participants: 4, lastUsed: "Today" },
        { id: "2", name: "Project Review", participants: 6, lastUsed: "Yesterday" },
        { id: "3", name: "Design Sync", participants: 3, lastUsed: "3 days ago" },
    ];

    const generateRoomName = () => {
        const adjectives = ["swift", "bright", "calm", "bold", "quick"];
        const nouns = ["meeting", "sync", "call", "huddle", "session"];
        const random = Math.random().toString(36).substring(2, 6);
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adj}-${noun}-${random}`;
    };

    const startCall = (room: string) => {
        if (!room.trim()) return;
        const cleanRoom = room.replace(/\s+/g, "-").toLowerCase();
        const userName = encodeURIComponent(session?.user?.name || "Guest");

        // Open Jitsi in new tab - no embed restrictions!
        const jitsiUrl = `https://meet.jit.si/CollabFlow-${cleanRoom}#userInfo.displayName="${userName}"&config.prejoinPageEnabled=false`;
        window.open(jitsiUrl, "_blank");

        setLastRoom(cleanRoom);
    };

    const copyRoomLink = (room: string) => {
        const jitsiLink = `https://meet.jit.si/CollabFlow-${room}`;
        navigator.clipboard.writeText(jitsiLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
                    Video Calls
                </h1>
                <p className="text-muted-foreground mt-1">
                    Start or join a video call with your team
                </p>
            </motion.div>

            {/* Start New Call */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Video className="w-5 h-5" />
                            Start a New Call
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-3">
                            <Input
                                placeholder="Enter room name or leave blank for random"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && startCall(roomName || generateRoomName())}
                                className="flex-1"
                            />
                            <Button
                                className="btn-primary"
                                onClick={() => startCall(roomName || generateRoomName())}
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Start Call
                            </Button>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                            <Video className="w-5 h-5 text-emerald-500 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-foreground">Powered by Jitsi Meet</p>
                                <p className="text-muted-foreground">
                                    Free, open-source video conferencing. Opens in a new tab with no time limits!
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Last Room */}
            {lastRoom && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                    <Video className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-foreground">Last Room: CollabFlow-{lastRoom}</p>
                                    <p className="text-xs text-muted-foreground">Click to rejoin or share the link</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyRoomLink(lastRoom)}
                                >
                                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                                    {copied ? "Copied!" : "Copy Link"}
                                </Button>
                                <Button
                                    size="sm"
                                    className="btn-primary"
                                    onClick={() => startCall(lastRoom)}
                                >
                                    Rejoin
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => startCall(generateRoomName())}
                >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                            <Video className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="font-medium text-sm text-foreground">Instant Meeting</span>
                        <span className="text-xs text-muted-foreground mt-1">Opens in new tab</span>
                    </CardContent>
                </Card>

                <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => document.querySelector<HTMLInputElement>('input')?.focus()}
                >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                            <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-sm text-foreground">Join Room</span>
                        <span className="text-xs text-muted-foreground mt-1">Enter room name</span>
                    </CardContent>
                </Card>

                <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                        const room = generateRoomName();
                        copyRoomLink(room);
                    }}
                >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="font-medium text-sm text-foreground">Invite Others</span>
                        <span className="text-xs text-muted-foreground mt-1">Copy invite link</span>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                            <Settings className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="font-medium text-sm text-foreground">Settings</span>
                        <span className="text-xs text-muted-foreground mt-1">Audio & video</span>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Recent Rooms */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h2 className="text-lg font-medium mb-4 text-foreground">Recent Rooms</h2>
                <div className="space-y-3">
                    {recentRooms.map((room) => (
                        <Card
                            key={room.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => startCall(room.name)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                        <Video className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm text-foreground">{room.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {room.participants} participants • {room.lastUsed}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                    Join
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
