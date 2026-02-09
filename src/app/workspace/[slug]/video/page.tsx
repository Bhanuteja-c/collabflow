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
        <div className="min-h-full flex items-center justify-center bg-background relative overflow-hidden p-6">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="grid lg:grid-cols-2 gap-12 max-w-6xl w-full z-10 items-center">

                {/* Left Column: Hero Content */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col space-y-8"
                >
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium w-fit"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>New: Virtual Backgrounds & Blur</span>
                        </motion.div>

                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
                            Connect Instantly, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500">
                                Collaborate Freely.
                            </span>
                        </h1>

                        <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                            Experience premium video conferencing with real-time collaboration tools built right into your workspace.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                            size="lg"
                            onClick={() => startNewMeeting(false)}
                            className="h-14 px-8 text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                        >
                            <Video className="mr-2 h-5 w-5" />
                            New Meeting
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => startNewMeeting(true)}
                            className="h-14 px-8 text-lg border-2"
                        >
                            <ExternalLink className="mr-2 h-5 w-5" />
                            Open in Window
                        </Button>
                    </div>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-2 gap-6 pt-8 pr-12">
                        {features.map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + (i * 0.1) }}
                                className="flex items-start gap-3"
                            >
                                <div className="p-2 bg-muted rounded-lg">
                                    <feature.icon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">{feature.label}</h3>
                                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Right Column: Join Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex justify-center"
                >
                    <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-border/50 hover:bg-card/60 transition-colors shadow-2xl">
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-2xl font-bold">Join a Meeting</CardTitle>
                            <CardDescription>
                                Enter the meeting code to join your team.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-xl border border-border p-1 focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-background/50">
                                <Input
                                    placeholder="Enter code (e.g. abc-def-ghi)"
                                    value={meetingId}
                                    onChange={(e) => setMeetingId(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && joinMeeting(false)}
                                    className="border-0 shadow-none focus-visible:ring-0 h-12 text-lg bg-transparent"
                                />
                            </div>

                            <div className="grid grid-cols-5 gap-2">
                                <Button
                                    className="col-span-4 h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:to-primary"
                                    onClick={() => joinMeeting(false)}
                                    disabled={!meetingId.trim()}
                                >
                                    Join Now
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    className="col-span-1 h-12 bg-background/50"
                                    onClick={() => joinMeeting(true)}
                                    disabled={!meetingId.trim()}
                                    title="Open in new window"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border/60" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background/0 backdrop-blur px-2 text-muted-foreground font-medium">
                                        or invite others
                                    </span>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-4 text-center">
                                <p className="text-sm text-muted-foreground mb-3">
                                    Send an invite link to start collaborating.
                                </p>
                                <Button variant="secondary" size="sm" className="w-full">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Generate Invite Link
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
