// src/app/workspace/[slug]/video/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
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

    return (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid gap-8 md:grid-cols-2 max-w-4xl w-full"
            >
                {/* Hero Section */}
                <div className="flex flex-col justify-center space-y-6">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25"
                    >
                        <Video className="h-8 w-8 text-primary-foreground" />
                    </motion.div>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight mb-3">
                            Video Conferencing
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            Connect with your team instantly. Crystal clear video and audio with screen sharing capabilities.
                        </p>
                    </div>
                    {session?.user?.name && (
                        <p className="text-sm text-muted-foreground">
                            Joining as <span className="font-medium text-foreground">{session.user.name}</span>
                        </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
                            <Users className="w-4 h-4" />
                            <span>Unlimited participants</span>
                        </div>
                        <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
                            <Sparkles className="w-4 h-4" />
                            <span>HD Video</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <Button size="lg" onClick={() => startNewMeeting(false)} className="h-12 px-6">
                            <Video className="mr-2 h-5 w-5" />
                            New Meeting
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => startNewMeeting(true)}
                            className="h-12 px-6"
                            title="Opens in a popup window so you can browse while in the meeting"
                        >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open in Window
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        💡 Tip: Use "Open in Window" to keep your meeting active while navigating other pages
                    </p>
                </div>

                {/* Join Card */}
                <Card className="w-full max-w-md mx-auto shadow-xl border-muted/50">
                    <CardHeader className="space-y-2">
                        <CardTitle className="text-2xl">Join a Meeting</CardTitle>
                        <CardDescription className="text-base">
                            Enter the meeting code to join an existing call.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Input
                                placeholder="Enter meeting code"
                                value={meetingId}
                                onChange={(e) => setMeetingId(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && joinMeeting(false)}
                                className="h-12 text-lg"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                className="flex-1 h-12"
                                onClick={() => joinMeeting(false)}
                                disabled={!meetingId.trim()}
                            >
                                Join
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12"
                                onClick={() => joinMeeting(true)}
                                disabled={!meetingId.trim()}
                                title="Open in popup window"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">
                                    Or
                                </span>
                            </div>
                        </div>
                        <p className="text-center text-sm text-muted-foreground">
                            Share the meeting link with others to invite them.
                        </p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
