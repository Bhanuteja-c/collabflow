// src/app/workspace/[slug]/video/[roomId]/page.tsx
"use client";

import { useState, useEffect, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useVideoCall } from "@/hooks/useVideoCall";
import { VideoLobby } from "@/components/video/VideoLobby";
import { VideoChat } from "@/components/video/VideoChat";
import { ParticipantList } from "@/components/video/ParticipantList";
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    MonitorUp, MonitorOff, Copy, Check, Users, MessageSquare,
    Maximize, Minimize, Hand, Smile, LayoutGrid, Focus, PictureInPicture2
} from "lucide-react";
import { ConnectionQualityIndicator } from "@/components/video/ConnectionQualityIndicator";

// Reaction type
interface Reaction {
    id: string;
    emoji: string;
    userId: string;
    userName: string;
}

const EMOJI_REACTIONS = ["👍", "🎉", "❤️", "😂", "😮", "👏"];

interface VideoRoomPageProps {
    params: Promise<{ slug: string; roomId: string }>;
}

export default function WorkspaceVideoRoomPage({ params }: VideoRoomPageProps) {
    const resolvedParams = use(params);
    const [roomId, setRoomId] = useState("");
    const [slug, setSlug] = useState("");
    const { data: session } = useSession();
    const router = useRouter();

    // State
    const [isInLobby, setIsInLobby] = useState(true);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [copied, setCopied] = useState(false);

    // UI panels
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Reactions only (chat is from hook)
    const [flyingReactions, setFlyingReactions] = useState<Reaction[]>([]);
    const [originalVideoTrack, setOriginalVideoTrack] = useState<MediaStreamTrack | null>(null);

    const userVideoRef = useRef<HTMLVideoElement>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    // View modes and active speaker
    const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid');
    const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
    const [isPiPActive, setIsPiPActive] = useState(false);

    // Get userId from session
    const userId = (session?.user as any)?.id || "";
    const userName = displayName || session?.user?.name || "Guest";
    const userImage = session?.user?.image || "";

    // Use video call hook
    const { connected, peers, chatMessages, sendChatMessage: hookSendMessage, replaceVideoTrack } = useVideoCall({
        roomId: isInLobby ? "" : roomId,
        userId,
        userName,
        userImage,
        localStream,
    });

    // Unpack params
    useEffect(() => {
        setRoomId(resolvedParams.roomId);
        setSlug(resolvedParams.slug);
    }, [resolvedParams]);

    // Set up local video
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
            screenStreamRef.current?.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
            setIsScreenSharing(false);
            if (originalVideoTrack && localStream) {
                replaceVideoTrack(originalVideoTrack);
            }
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screenStream;

                const screenTrack = screenStream.getVideoTracks()[0];
                if (screenTrack) {
                    if (localStream) {
                        const origTrack = localStream.getVideoTracks()[0];
                        if (origTrack) {
                            setOriginalVideoTrack(origTrack);
                        }
                    }
                    replaceVideoTrack(screenTrack);
                    setIsScreenSharing(true);

                    screenTrack.onended = () => {
                        setIsScreenSharing(false);
                        screenStreamRef.current = null;
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
        if (!document.fullscreenElement && containerRef.current) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const leaveCall = () => {
        localStream?.getTracks().forEach(track => track.stop());
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        router.push(`/workspace/${slug}/video`);
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
        setTimeout(() => {
            setFlyingReactions(prev => prev.filter(r => r.id !== reaction.id));
        }, 3000);
    };

    const toggleHandRaise = () => {
        setIsHandRaised(!isHandRaised);
    };

    // Toggle Picture-in-Picture
    const togglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                setIsPiPActive(false);
            } else if (userVideoRef.current && !isVideoOff) {
                await userVideoRef.current.requestPictureInPicture();
                setIsPiPActive(true);
            }
        } catch (err) {
            console.error("PiP error:", err);
        }
    };

    // Toggle view mode
    const toggleViewMode = () => {
        setViewMode(prev => prev === 'grid' ? 'speaker' : 'grid');
    };

    // Get dominant speaker (first peer with stream, or first peer)
    const dominantSpeaker = peers.find(p => p.stream) || peers[0];

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
            className="flex flex-col h-[calc(100vh-3.5rem)] bg-neutral-900 relative overflow-hidden"
        >
            {/* Flying Reactions */}
            <AnimatePresence>
                {flyingReactions.map((reaction) => (
                    <motion.div
                        key={reaction.id}
                        initial={{ opacity: 1, y: 0, x: Math.random() * 200 }}
                        animate={{ opacity: 0, y: -300 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 3 }}
                        className="absolute bottom-20 text-5xl pointer-events-none z-50"
                        style={{ left: `${20 + Math.random() * 60}%` }}
                    >
                        {reaction.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 bg-neutral-800/50 backdrop-blur-sm border-b border-neutral-700">
                <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-primary hidden sm:block" />
                    <span className="font-medium text-white text-sm sm:text-base">Meeting</span>
                    <span className="text-neutral-400 text-xs sm:text-sm font-mono hidden sm:inline">{roomId.slice(0, 8)}...</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {connected ? '● Connected' : '● Connecting...'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* View mode toggle */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleViewMode}
                        className="text-neutral-300 hover:text-white hidden sm:flex gap-1"
                        title={viewMode === 'grid' ? 'Switch to speaker view' : 'Switch to grid view'}
                    >
                        {viewMode === 'grid' ? <Focus className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                        <span className="hidden md:inline">{viewMode === 'grid' ? 'Speaker' : 'Grid'}</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowParticipants(!showParticipants)}
                        className="text-neutral-300 hover:text-white"
                    >
                        <Users className="w-4 h-4 mr-1" />
                        {participants.length}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={copyInviteLink}
                        className="gap-2 hidden sm:flex"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Invite
                    </Button>
                    <Button variant="ghost" size="icon" onClick={copyInviteLink} className="sm:hidden">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    {/* PiP button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePiP}
                        className="hidden sm:flex"
                        title="Picture-in-Picture"
                        disabled={isVideoOff}
                    >
                        <PictureInPicture2 className={`w-4 h-4 ${isPiPActive ? 'text-primary' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex relative">
                {/* Video Area */}
                <div className={`flex-1 p-2 sm:p-4 transition-all ${showChat || showParticipants ? 'lg:mr-80' : ''}`}>

                    {/* Speaker View Mode */}
                    {viewMode === 'speaker' && peers.length > 0 ? (
                        <div className="relative h-full">
                            {/* Dominant Speaker - Large */}
                            <motion.div
                                layout
                                className="w-full h-full bg-neutral-800 rounded-xl overflow-hidden"
                            >
                                {dominantSpeaker?.stream ? (
                                    <video
                                        autoPlay
                                        playsInline
                                        ref={(el) => {
                                            if (el && dominantSpeaker.stream) el.srcObject = dominantSpeaker.stream;
                                        }}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                                        <Avatar className="h-32 w-32">
                                            <AvatarImage src={dominantSpeaker?.userData.image} />
                                            <AvatarFallback className="text-5xl bg-primary/20 text-primary">
                                                {dominantSpeaker?.userData.name?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                )}
                                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                    <span className="px-3 py-1.5 bg-black/60 rounded-lg text-sm text-white">
                                        {dominantSpeaker?.userData.name}
                                    </span>
                                    {dominantSpeaker && <ConnectionQualityIndicator quality={dominantSpeaker.connectionQuality} />}
                                </div>
                            </motion.div>

                            {/* Floating Self-View - Google Meet Style */}
                            <motion.div
                                layout
                                drag
                                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                className="absolute bottom-4 right-4 w-40 h-28 sm:w-56 sm:h-40 bg-neutral-800 rounded-xl overflow-hidden shadow-xl border-2 border-neutral-700 hover:border-primary/50 transition-colors cursor-move z-10"
                            >
                                <video
                                    ref={userVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                                />
                                {isVideoOff && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={userImage} />
                                            <AvatarFallback className="text-xl bg-primary/20 text-primary">
                                                {userName?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                )}
                                <div className="absolute bottom-1 left-1 flex items-center gap-1">
                                    <span className="px-1.5 py-0.5 bg-black/60 rounded text-xs text-white">
                                        You {isHandRaised && '✋'}
                                    </span>
                                    {isMuted && <MicOff className="w-3 h-3 text-red-500" />}
                                </div>
                            </motion.div>

                            {/* Other Participants Thumbnails */}
                            {peers.length > 1 && (
                                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                                    {peers.filter(p => p.socketId !== dominantSpeaker?.socketId).slice(0, 3).map((peer) => (
                                        <motion.div
                                            key={peer.socketId}
                                            layout
                                            className="w-24 h-16 sm:w-32 sm:h-20 bg-neutral-800 rounded-lg overflow-hidden shadow-lg border border-neutral-700 cursor-pointer hover:border-primary/50 transition-colors"
                                            onClick={() => {/* Could switch dominant speaker */ }}
                                        >
                                            {peer.stream ? (
                                                <video
                                                    autoPlay
                                                    playsInline
                                                    ref={(el) => { if (el && peer.stream) el.srcObject = peer.stream; }}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={peer.userData.image} />
                                                        <AvatarFallback className="text-sm bg-primary/20 text-primary">
                                                            {peer.userData.name?.[0]?.toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Grid View Mode - Original Layout */
                        <div className={`grid gap-2 sm:gap-4 h-full ${peers.length === 0 ? 'grid-cols-1' :
                            peers.length === 1 ? 'grid-cols-1 sm:grid-cols-2' :
                                peers.length <= 3 ? 'grid-cols-1 sm:grid-cols-2' :
                                    'grid-cols-2 lg:grid-cols-3'
                            }`}>
                            {/* Local Video */}
                            <motion.div
                                layout
                                className="relative bg-neutral-800 rounded-xl overflow-hidden aspect-video ring-2 ring-transparent hover:ring-primary/30 transition-all"
                            >
                                <video
                                    ref={userVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                                />
                                {isVideoOff && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                                        <Avatar className="h-16 w-16 sm:h-24 sm:w-24">
                                            <AvatarImage src={userImage} />
                                            <AvatarFallback className="text-3xl bg-primary/20 text-primary">
                                                {userName?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                )}
                                <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-black/60 rounded text-xs sm:text-sm text-white truncate max-w-[100px] sm:max-w-none">
                                        {userName} (You) {isHandRaised && '✋'}
                                    </span>
                                    {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                                </div>
                            </motion.div>

                            {/* Remote Videos */}
                            {peers.map((peer) => (
                                <motion.div
                                    key={peer.socketId}
                                    layout
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative bg-neutral-800 rounded-xl overflow-hidden aspect-video ring-2 ring-transparent hover:ring-primary/30 transition-all"
                                >
                                    {peer.stream ? (
                                        <video
                                            autoPlay
                                            playsInline
                                            ref={(el) => {
                                                if (el && peer.stream) el.srcObject = peer.stream;
                                            }}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                                            <Avatar className="h-16 w-16 sm:h-24 sm:w-24">
                                                <AvatarImage src={peer.userData.image} />
                                                <AvatarFallback className="text-3xl bg-primary/20 text-primary">
                                                    {peer.userData.name?.[0]?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                    )}
                                    <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-black/60 rounded text-xs sm:text-sm text-white truncate max-w-[100px] sm:max-w-none">
                                            {peer.userData.name}
                                        </span>
                                        <ConnectionQualityIndicator quality={peer.connectionQuality} />
                                    </div>
                                </motion.div>
                            ))}

                            {/* Empty state */}
                            {peers.length === 0 && (
                                <div className="flex items-center justify-center text-neutral-500">
                                    <div className="text-center">
                                        <div className="animate-pulse mb-4">
                                            <Users className="w-12 h-12 mx-auto opacity-50" />
                                        </div>
                                        <p>Waiting for others to join</p>
                                        <p className="text-sm mt-1 text-neutral-600">Share the invite link to bring others in</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
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
            <div className="flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 bg-neutral-800/80 backdrop-blur-sm border-t border-neutral-700">
                <Button
                    variant={isMuted ? "destructive" : "secondary"}
                    size="icon"
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                    onClick={toggleMute}
                >
                    {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                </Button>

                <Button
                    variant={isVideoOff ? "destructive" : "secondary"}
                    size="icon"
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                    onClick={toggleVideo}
                >
                    {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
                </Button>

                {/* Screen share - hidden on mobile */}
                <Button
                    variant={isScreenSharing ? "default" : "secondary"}
                    size="icon"
                    className="hidden sm:flex h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                    onClick={toggleScreenShare}
                >
                    {isScreenSharing ? <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5" />}
                </Button>

                <div className="relative">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                        onClick={() => setShowReactions(!showReactions)}
                    >
                        <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    <AnimatePresence>
                        {showReactions && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2 bg-neutral-700 rounded-full p-2"
                            >
                                {EMOJI_REACTIONS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => sendReaction(emoji)}
                                        className="text-2xl hover:scale-125 transition-transform"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Hand raise - hidden on small mobile */}
                <Button
                    variant={isHandRaised ? "default" : "secondary"}
                    size="icon"
                    className="hidden xs:flex h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                    onClick={toggleHandRaise}
                >
                    <Hand className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>

                <Button
                    variant={showChat ? "default" : "secondary"}
                    size="icon"
                    className="hidden sm:flex h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                    onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
                >
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>

                <Button
                    variant="destructive"
                    size="icon"
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                    onClick={leaveCall}
                >
                    <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
            </div>
        </div>
    );
}
