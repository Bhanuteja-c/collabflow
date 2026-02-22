// src/app/workspace/[slug]/video/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Video, Users, ArrowRight, ExternalLink, Sparkles,
    Shield, Zap, Globe, MessageSquare
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function WorkspaceVideoPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const { data: session } = useSession();
    const [meetingId, setMeetingId] = useState("");

    const startNewMeeting = (openInNewWindow = false) => {
        const id = uuidv4();
        const url = `/workspace/${slug}/video/${id}`;

        if (openInNewWindow) {
            window.open(
                url,
                'CollabFlow Meeting',
                'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no'
            );
        } else {
            router.push(url);
        }
    };

    const joinMeeting = (openInNewWindow = false) => {
        if (meetingId.trim()) {
            const url = `/workspace/${slug}/video/${meetingId.trim()}`;

            if (openInNewWindow) {
                window.open(
                    url,
                    'CollabFlow Meeting',
                    'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no'
                );
            } else {
                router.push(url);
            }
        }
    };

    const features = [
        { icon: Users, label: "Unlimited Users", desc: "Connect with everyone" },
        { icon: Sparkles, label: "HD Quality", desc: "Crystal clear video" },
        { icon: Shield, label: "Secure", desc: "End-to-end encryption" },
        { icon: Zap, label: "Fast", desc: "Low latency streaming" },
    ];

    return (
        <div className="min-h-full flex items-center justify-center relative overflow-hidden p-6">
            {/* Very subtle ambient background */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Content Container */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 max-w-6xl w-full z-10 items-center">
                
                {/* Left Column: Hero Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col space-y-8"
                >
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium backdrop-blur-sm">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Premium Workspace Video</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                            Secure meetings, <br />
                            <span className="text-muted-foreground">built for teams.</span>
                        </h1>

                        <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                            Start instantly, share your screen, and collaborate seamlessly without ever leaving your workspace.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            size="lg"
                            onClick={() => startNewMeeting(false)}
                            className="h-12 px-8 rounded-full shadow-lg shadow-primary/20 text-base active:scale-[0.98] transition-all"
                        >
                            <Video className="mr-2 h-4 w-4" />
                            Start Meeting
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => startNewMeeting(true)}
                            className="h-12 px-8 rounded-full text-base bg-background/50 backdrop-blur-sm active:scale-[0.98] transition-all"
                        >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Window
                        </Button>
                    </div>

                    {/* Minimal Feature Grid */}
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
                </motion.div>

                {/* Right Column: Join Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex justify-center lg:justify-end"
                >
                    <Card className="w-full max-w-[420px] bg-card/40 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden rounded-2xl">
                        {/* Decorative header line */}
                        <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
                        
                        <CardHeader className="space-y-2 pb-6 pt-8 px-8">
                            <CardTitle className="text-xl font-semibold tracking-tight">Join Existing Meeting</CardTitle>
                            <CardDescription className="text-sm">
                                Enter a meeting code to join your team.
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-6 px-8 pb-8">
                            <div className="space-y-3">
                                <div className="relative group">
                                    <Input
                                        placeholder="e.g. abc-def-ghi"
                                        value={meetingId}
                                        onChange={(e) => setMeetingId(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && joinMeeting(false)}
                                        className="h-12 pl-4 pr-12 bg-background/50 border-border/50 focus-visible:ring-1 focus-visible:border-primary transition-all text-base rounded-xl"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute right-1 top-1 h-10 w-10 text-muted-foreground hover:text-foreground opacity-50 group-hover:opacity-100 transition-opacity"
                                        onClick={() => joinMeeting(true)}
                                        disabled={!meetingId.trim()}
                                        title="Open in new window"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>

                                <Button
                                    className="w-full h-12 text-sm font-medium rounded-xl active:scale-[0.98] transition-all"
                                    onClick={() => joinMeeting(false)}
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
                                    <span className="bg-card/40 backdrop-blur-sm px-3 text-muted-foreground">
                                        or
                                    </span>
                                </div>
                            </div>

                            <div className="hidden sm:block">
                                <Button 
                                    variant="secondary" 
                                    className="w-full h-11 text-xs rounded-xl bg-muted/50 hover:bg-muted font-medium"
                                    onClick={() => {
                                        startNewMeeting(false);
                                    }}
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
