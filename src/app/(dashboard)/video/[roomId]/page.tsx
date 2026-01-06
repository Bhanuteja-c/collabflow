// src/app/(dashboard)/video/[roomId]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useVideoCall } from "@/hooks/useVideoCall";
import { VideoLobby } from "@/components/video/VideoLobby";
import { VideoChat } from "@/components/video/VideoChat";
import { ParticipantList } from "@/components/video/ParticipantList";
import {
    Mic, MicOff, Video, VideoOff,
    PhoneOff, MonitorUp, Loader2,
    Users, Copy, Check, MessageSquare,
    Maximize, Minimize, Hand, Smile
} from "lucide-react";

// Reaction type
interface Reaction {
    id: string;
    emoji: string;
    userId: string;
    userName: string;
}

const EMOJI_REACTIONS = ["👍", "🎉", "❤️", "😂", "😮", "👏"];

export default function VideoRoom({ params }: { params: Promise<{ roomId: string }> }) {
    const { data: session } = useSession();
    const router = useRouter();
    const [roomId, setRoomId] = useState<string>("");

    // Pre-join lobby state
    const [isInLobby, setIsInLobby] = useState(true);
    const [displayName, setDisplayName] = useState("");

    // Media states
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // UI states
    const [copied, setCopied] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);

    // Reactions only (chat is from hook)
    const [flyingReactions, setFlyingReactions] = useState<Reaction[]>([]);
    const [originalVideoTrack, setOriginalVideoTrack] = useState<MediaStreamTrack | null>(null);

    const userVideoRef = useRef<HTMLVideoElement>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get userId from session
    const userId = (session?.user as any)?.id || "";
    const userName = displayName || session?.user?.name || "Guest";
    const userImage = session?.user?.image || "";

    // Use video call hook
    const { connected, peers, chatMessages, sendChatMessage: hookSendMessage, replaceVideoTrack } = useVideoCall({
        roomId: isInLobby ? "" : roomId, // Don't connect until joined
        userId,
        userName,
        userImage,
        localStream,
    });

    // Unpack params
    useEffect(() => {
        params.then(p => setRoomId(p.roomId));
    }, [params]);

    // Set video element when stream changes
    useEffect(() => {
        if (localStream && userVideoRef.current) {
            userVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Handle joining from lobby
    const handleJoinFromLobby = (stream: MediaStream | null, name: string) => {
        setLocalStream(stream);
        setDisplayName(name);
        setIsInLobby(false);
        // If no stream, set video off
        if (!stream) {
            setIsVideoOff(true);
            setIsMuted(true);
        }
    };

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

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop screen sharing and restore original video track
            screenStreamRef.current?.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
            setIsScreenSharing(false);

            // Restore original video track
            if (originalVideoTrack && localStream) {
                replaceVideoTrack(originalVideoTrack);
            }
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screenStream;

                const screenTrack = screenStream.getVideoTracks()[0];
                if (screenTrack) {
                    // Save original video track before replacing
                    if (localStream) {
                        const origTrack = localStream.getVideoTracks()[0];
                        if (origTrack) {
                            setOriginalVideoTrack(origTrack);
                        }
                    }

                    // Replace video track in peer connections
                    replaceVideoTrack(screenTrack);
                    setIsScreenSharing(true);

                    screenTrack.onended = () => {
                        setIsScreenSharing(false);
                        screenStreamRef.current = null;
                        // Restore original track
                        if (originalVideoTrack) {
                            replaceVideoTrack(originalVideoTrack);
                        }
                    };
                }
            } catch (err) {
                console.error("Error sharing screen:", err);
            }
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const leaveCall = () => {
        localStream?.getTracks().forEach(track => track.stop());
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        router.push("/video");
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Use the hook's sendChatMessage
    const handleSendChatMessage = (content: string) => {
        hookSendMessage(content);
    };

    const sendReaction = (emoji: string) => {
        const reaction: Reaction = {
            id: Date.now().toString(),
            emoji,
            userId,
            userName,
        };
        setFlyingReactions(prev => [...prev, reaction]);
        setShowReactions(false);

        // Remove after animation
        setTimeout(() => {
            setFlyingReactions(prev => prev.filter(r => r.id !== reaction.id));
        }, 3000);
    };

    const toggleHandRaise = () => {
        setIsHandRaised(!isHandRaised);
        // TODO: Broadcast via socket
    };

    // Prepare participants list
    const participants = [
        { id: userId, name: userName, image: userImage, isMuted, isVideoOff, isHost: true },
        ...peers.map(p => ({
            id: p.userData.id,
            name: p.userData.name,
            image: p.userData.image,
            isMuted: false,
            isVideoOff: !p.stream,
        }))
    ];

    // Calculate grid layout
    const participantCount = peers.length + 1;
    const gridCols = participantCount <= 1 ? 1 : participantCount <= 4 ? 2 : 3;

    // Show lobby if not joined yet
    if (isInLobby) {
        return (
            <VideoLobby
                userName={session?.user?.name || "Guest"}
                userImage={session?.user?.image || ""}
                roomId={roomId}
                onJoin={handleJoinFromLobby}
            />
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative flex flex-col h-[calc(100vh-3.5rem)] bg-neutral-900 text-white"
        >
            {/* Flying Reactions */}
            <AnimatePresence>
                {flyingReactions.map((reaction) => (
                    <motion.div
                        key={reaction.id}
                        initial={{ y: 0, x: "50%", opacity: 1, scale: 0.5 }}
                        animate={{ y: -300, opacity: 0, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 3, ease: "easeOut" }}
                        className="absolute bottom-32 left-1/2 text-5xl pointer-events-none z-30"
                    >
                        {reaction.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-700 bg-neutral-900/80 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-primary" />
                        <span className="font-semibold">Meeting</span>
                    </div>
                    <span className="text-neutral-400 text-sm font-mono">
                        {roomId?.slice(0, 8)}...
                    </span>
                    {connected && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Connected
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowParticipants(!showParticipants)}
                        className={showParticipants ? "bg-neutral-700" : ""}
                    >
                        <Users className="w-4 h-4 mr-2" />
                        {participantCount}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={copyInviteLink}>
                        {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied ? "Copied!" : "Invite"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-9 w-9">
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative overflow-hidden">
                {/* Video Grid */}
                <div className="h-full p-4 overflow-auto">
                    <div
                        className="grid gap-4 h-full"
                        style={{
                            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                            maxHeight: participantCount > 2 ? 'none' : '100%'
                        }}
                    >
                        {/* Local Video */}
                        <motion.div
                            layout
                            className="relative bg-neutral-800 rounded-2xl overflow-hidden shadow-2xl min-h-[200px]"
                        >
                            <video
                                playsInline
                                muted
                                ref={userVideoRef}
                                autoPlay
                                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                            />
                            {isVideoOff && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                                    <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                                        <AvatarImage src={userImage} />
                                        <AvatarFallback className="text-2xl bg-primary/20 text-primary">{userName?.[0]}</AvatarFallback>
                                    </Avatar>
                                </div>
                            )}
                            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                                {userName}
                                {isHandRaised && <span className="text-lg">✋</span>}
                                {isMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                            </div>
                        </motion.div>

                        {/* Remote Videos */}
                        {peers.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="relative bg-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center min-h-[200px]"
                            >
                                <div className="text-center p-6">
                                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
                                    <h3 className="text-lg font-semibold mb-2">Waiting for others</h3>
                                    <p className="text-neutral-400 text-sm">
                                        Share the invite link to bring others in
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {peers.map((peer) => (
                            <motion.div
                                layout
                                key={peer.socketId}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative bg-neutral-800 rounded-2xl overflow-hidden shadow-2xl min-h-[200px]"
                            >
                                {peer.stream ? (
                                    <video
                                        playsInline
                                        autoPlay
                                        ref={(el) => {
                                            if (el && peer.stream) {
                                                el.srcObject = peer.stream;
                                            }
                                        }}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                                        <Avatar className="h-24 w-24 ring-4 ring-neutral-700">
                                            <AvatarImage src={peer.userData.image} />
                                            <AvatarFallback className="text-2xl">
                                                {peer.userData.name?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                )}
                                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium">
                                    {peer.userData.name}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Side Panels */}
                <VideoChat
                    isOpen={showChat}
                    onClose={() => setShowChat(false)}
                    messages={chatMessages}
                    onSendMessage={handleSendChatMessage}
                    currentUserId={userId}
                />
                <ParticipantList
                    isOpen={showParticipants && !showChat}
                    onClose={() => setShowParticipants(false)}
                    participants={participants}
                    currentUserId={userId}
                />
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-neutral-700 bg-neutral-900/80 backdrop-blur-sm">
                <div className="flex justify-center items-center gap-3">
                    {/* Mic */}
                    <Button
                        variant={isMuted ? "destructive" : "secondary"}
                        size="lg"
                        className="rounded-full h-14 w-14 p-0"
                        onClick={toggleMute}
                    >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </Button>

                    {/* Video */}
                    <Button
                        variant={isVideoOff ? "destructive" : "secondary"}
                        size="lg"
                        className="rounded-full h-14 w-14 p-0"
                        onClick={toggleVideo}
                    >
                        {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </Button>

                    {/* Screen Share */}
                    <Button
                        variant={isScreenSharing ? "default" : "secondary"}
                        size="lg"
                        className="rounded-full h-14 w-14 p-0"
                        onClick={toggleScreenShare}
                    >
                        <MonitorUp className="w-6 h-6" />
                    </Button>

                    {/* Reactions */}
                    <div className="relative">
                        <Button
                            variant="secondary"
                            size="lg"
                            className="rounded-full h-14 w-14 p-0"
                            onClick={() => setShowReactions(!showReactions)}
                        >
                            <Smile className="w-6 h-6" />
                        </Button>
                        <AnimatePresence>
                            {showReactions && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                    className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-neutral-800 rounded-full px-3 py-2 flex gap-1 shadow-xl border border-neutral-700"
                                >
                                    {EMOJI_REACTIONS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() => sendReaction(emoji)}
                                            className="text-2xl hover:scale-125 transition-transform p-1"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Raise Hand */}
                    <Button
                        variant={isHandRaised ? "default" : "secondary"}
                        size="lg"
                        className="rounded-full h-14 w-14 p-0"
                        onClick={toggleHandRaise}
                    >
                        <Hand className="w-6 h-6" />
                    </Button>

                    {/* Chat */}
                    <Button
                        variant={showChat ? "default" : "secondary"}
                        size="lg"
                        className="rounded-full h-14 w-14 p-0"
                        onClick={() => {
                            setShowChat(!showChat);
                            setShowParticipants(false);
                        }}
                    >
                        <MessageSquare className="w-6 h-6" />
                    </Button>

                    {/* Leave Call */}
                    <Button
                        variant="destructive"
                        size="lg"
                        className="rounded-full h-14 w-14 p-0"
                        onClick={leaveCall}
                    >
                        <PhoneOff className="w-6 h-6" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
