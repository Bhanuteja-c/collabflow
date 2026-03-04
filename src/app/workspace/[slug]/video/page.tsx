// src/app/workspace/[slug]/video/page.tsx
// Video meeting launcher — always opens calls in a new tab
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Video, Users, ArrowRight, ExternalLink, Sparkles,
    Shield, Zap, Globe
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function WorkspaceVideoPage() {
    const params = useParams();
    const slug = params.slug as string;
    const { data: session } = useSession();
    const [meetingId, setMeetingId] = useState("");

    // Always open in a new tab — keeps the workspace intact
    const openVideoRoom = (roomId: string) => {
        const url = `/workspace/${slug}/video/${roomId}`;
        window.open(url, '_blank', 'noopener');
    };

    const startNewMeeting = () => {
        // Generate a clean 9-character code like "abc-defg-hij" for readability
        const randomString = () => Math.random().toString(36).substring(2, 6);
        const code = `${randomString()}-${randomString()}`;
        openVideoRoom(code);
    };

    const joinMeeting = () => {
        if (meetingId.trim()) {
            openVideoRoom(meetingId.trim());
        }
    };

    const features = [
        { icon: Users, label: "Up to 6 Users", desc: "Connect with your team" },
        { icon: Sparkles, label: "HD Quality", desc: "Crystal clear video" },
        { icon: Shield, label: "Secure", desc: "End-to-end encrypted" },
        { icon: Zap, label: "Fast", desc: "Low latency streaming" },
    ];

    return (
        <div className="min-h-full flex items-center justify-center relative overflow-hidden p-6">
            {/* Subtle ambient background */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 max-w-6xl w-full z-10 items-center">
                
                {/* Left: Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col space-y-8"
                >
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Premium Workspace Video</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                            Secure meetings, <br />
                            <span className="text-muted-foreground">built for teams.</span>
                        </h1>

                        <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                            Start instantly, share your screen, and collaborate seamlessly. Meetings open in a separate tab so your workspace stays uninterrupted.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            size="lg"
                            onClick={startNewMeeting}
                            className="h-12 px-8 rounded-full shadow-lg shadow-primary/20 text-base active:scale-[0.98] transition-all"
                        >
                            <Video className="mr-2 h-4 w-4" />
                            New Meeting
                        </Button>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-y-6 gap-x-8 pt-6 border-t border-border/50 mt-8">
                        {features.map((feature, i) => (
                            <div key={i} className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                                    <feature.icon className="w-4 h-4 text-primary" />
                                    {feature.label}
                                </div>
                                <p className="text-xs text-muted-foreground">{feature.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Meetings open in a new tab for the best experience</span>
                    </div>
                </motion.div>

                {/* Right: Join Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex justify-center lg:justify-end"
                >
                    <Card className="w-full max-w-[420px] bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden rounded-2xl">
                        <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
                        
                        <CardHeader className="space-y-2 pb-6 pt-8 px-8">
                            <CardTitle className="text-xl font-semibold tracking-tight">Join a Meeting</CardTitle>
                            <CardDescription className="text-sm">
                                Enter a meeting code to join your team.
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-6 px-8 pb-8">
                            <div className="space-y-3">
                                <Input
                                    placeholder="Enter meeting code"
                                    value={meetingId}
                                    onChange={(e) => setMeetingId(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && joinMeeting()}
                                    className="h-12 pl-4 bg-background/50 border-border/50 focus-visible:ring-1 focus-visible:border-primary text-base rounded-xl"
                                />

                                <Button
                                    className="w-full h-12 text-sm font-medium rounded-xl active:scale-[0.98] transition-all"
                                    onClick={joinMeeting}
                                    disabled={!meetingId.trim()}
                                >
                                    Join Meeting
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>

                            <div className="relative py-2 hidden sm:block">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border/40" />
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase font-medium tracking-wider">
                                    <span className="bg-card/40 backdrop-blur-sm px-3 text-muted-foreground">or</span>
                                </div>
                            </div>

                            <div className="hidden sm:block">
                                <Button 
                                    variant="secondary" 
                                    className="w-full h-11 text-xs rounded-xl bg-muted/50 hover:bg-muted font-medium"
                                    onClick={startNewMeeting}
                                >
                                    <Video className="w-3.5 h-3.5 mr-2" />
                                    Start an instant meeting
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
