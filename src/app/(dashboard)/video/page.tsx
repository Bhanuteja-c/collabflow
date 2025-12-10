// src/app/(dashboard)/video/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, ArrowRight } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function VideoPage() {
    const router = useRouter();
    const [meetingId, setMeetingId] = useState("");

    const startNewMeeting = () => {
        const id = uuidv4();
        router.push(`/video/${id}`);
    };

    const joinMeeting = () => {
        if (meetingId.trim()) {
            router.push(`/video/${meetingId.trim()}`);
        }
    };

    return (
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-background p-4">
            <div className="grid gap-8 md:grid-cols-2 max-w-4xl w-full">
                {/* Hero Section */}
                <div className="flex flex-col justify-center space-y-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Video className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        Video Conferencing for Everyone
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Connect with your team instantly. Crystal clear video and audio with screen sharing capabilities.
                    </p>
                    <div className="flex gap-4 pt-4">
                        <Button size="lg" onClick={startNewMeeting} className="h-12 px-8">
                            <Video className="mr-2 h-5 w-5" />
                            New Meeting
                        </Button>
                    </div>
                </div>

                {/* Join Card */}
                <Card className="w-full max-w-sm mx-auto shadow-lg border-muted">
                    <CardHeader>
                        <CardTitle>Join a Meeting</CardTitle>
                        <CardDescription>
                            Enter the meeting code to join an existing call.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                placeholder="Enter meeting code"
                                value={meetingId}
                                onChange={(e) => setMeetingId(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && joinMeeting()}
                                className="h-12 text-lg"
                            />
                        </div>
                        <Button
                            variant="secondary"
                            className="w-full h-12"
                            onClick={joinMeeting}
                            disabled={!meetingId.trim()}
                        >
                            Join Meeting
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or
                                </span>
                            </div>
                        </div>
                        <div className="text-center text-sm text-muted-foreground">
                            Share the link with others to invite them to the call.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
