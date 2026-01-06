// src/components/video/VideoLobby.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Mic, MicOff, Video, VideoOff,
    Loader2, ArrowRight, AlertCircle
} from "lucide-react";

interface VideoLobbyProps {
    userName: string;
    userImage: string;
    roomId: string;
    onJoin: (stream: MediaStream | null, displayName: string) => void;
}

export function VideoLobby({ userName, userImage, roomId, onJoin }: VideoLobbyProps) {
    const [displayName, setDisplayName] = useState(userName || "");
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mediaMode, setMediaMode] = useState<'full' | 'audio' | 'none'>('full');
    const videoRef = useRef<HTMLVideoElement>(null);

    // Update displayName when userName prop changes (e.g., when session loads)
    useEffect(() => {
        if (userName && !displayName) {
            setDisplayName(userName);
        }
    }, [userName, displayName]);

    // Initialize camera with retry options
    const initMedia = async (mode: 'full' | 'audio' | 'none') => {
        setIsLoading(true);
        setError(null);
        setMediaMode(mode);

        // Stop existing tracks
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }

        if (mode === 'none') {
            setIsLoading(false);
            return;
        }

        try {
            const constraints = mode === 'full'
                ? { video: true, audio: true }
                : { video: false, audio: true };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);
            if (videoRef.current && mode === 'full') {
                videoRef.current.srcObject = stream;
            }
            setIsVideoOff(mode === 'audio');
            setIsLoading(false);
        } catch (err: any) {
            console.error("Error accessing media devices:", err);

            // Try audio-only if full mode fails
            if (mode === 'full') {
                console.log("Trying audio-only mode...");
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    setLocalStream(audioStream);
                    setMediaMode('audio');
                    setIsVideoOff(true);
                    setError("Camera unavailable - joining with audio only");
                    setIsLoading(false);
                    return;
                } catch (audioErr) {
                    console.error("Audio-only also failed:", audioErr);
                }
            }

            setError("Could not access camera/microphone. You can still join without media.");
            setIsLoading(false);
        }
    };

    useEffect(() => {
        initMedia('full');

        return () => {
            // Don't stop tracks here - they'll be passed to the room
        };
    }, []);

    const toggleMute = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    const handleJoin = () => {
        if (displayName.trim()) {
            onJoin(localStream, displayName.trim());
        }
    };

    const handleJoinWithoutMedia = () => {
        if (displayName.trim()) {
            // Stop any existing streams
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            onJoin(null, displayName.trim());
        }
    };

    return (
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Ready to join?</h1>
                    <p className="text-neutral-400">
                        Meeting ID: <span className="font-mono text-primary">{roomId.slice(0, 8)}...</span>
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Video Preview */}
                    <div className="relative bg-neutral-800 rounded-2xl overflow-hidden aspect-video shadow-2xl">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            </div>
                        ) : error && !localStream ? (
                            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                                <div>
                                    <VideoOff className="w-12 h-12 mx-auto text-neutral-500 mb-4" />
                                    <p className="text-neutral-400 text-sm mb-4">{error}</p>
                                    <div className="space-y-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => initMedia('audio')}
                                            className="w-full"
                                        >
                                            <Mic className="w-4 h-4 mr-2" />
                                            Try Audio Only
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => initMedia('full')}
                                            className="w-full"
                                        >
                                            Retry Camera
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${isVideoOff || mediaMode === 'audio' ? 'hidden' : ''}`}
                                />
                                {(isVideoOff || mediaMode === 'audio') && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                                        <Avatar className="h-24 w-24">
                                            <AvatarImage src={userImage} />
                                            <AvatarFallback className="text-3xl bg-primary/20 text-primary">
                                                {displayName?.[0]?.toUpperCase() || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Controls overlay - only show if we have a stream */}
                        {localStream && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                                <Button
                                    variant={isMuted ? "destructive" : "secondary"}
                                    size="icon"
                                    className="rounded-full h-12 w-12 shadow-lg"
                                    onClick={toggleMute}
                                >
                                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </Button>
                                {mediaMode === 'full' && (
                                    <Button
                                        variant={isVideoOff ? "destructive" : "secondary"}
                                        size="icon"
                                        className="rounded-full h-12 w-12 shadow-lg"
                                        onClick={toggleVideo}
                                    >
                                        {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Settings Panel */}
                    <div className="flex flex-col justify-center space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">
                                Your name
                            </label>
                            <Input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Enter your name"
                                className="h-12 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                            />
                        </div>

                        {/* Status indicators */}
                        {localStream && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50">
                                    <div className={`w-3 h-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                    <span className="text-sm text-neutral-300">
                                        Microphone {isMuted ? 'off' : 'on'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50">
                                    <div className={`w-3 h-3 rounded-full ${isVideoOff || mediaMode === 'audio' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                    <span className="text-sm text-neutral-300">
                                        Camera {isVideoOff || mediaMode === 'audio' ? 'off' : 'on'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Warning for audio-only mode */}
                        {error && localStream && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            <Button
                                size="lg"
                                className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
                                onClick={handleJoin}
                                disabled={isLoading || !displayName.trim()}
                            >
                                {localStream ? 'Join Meeting' : 'Join Without Media'}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>

                            {/* Alternative join option */}
                            {localStream && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-neutral-400 hover:text-white"
                                    onClick={handleJoinWithoutMedia}
                                >
                                    Join as viewer (no mic/camera)
                                </Button>
                            )}
                            {!localStream && !isLoading && (
                                <p className="text-xs text-neutral-500 text-center">
                                    You'll join without camera/microphone access
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
