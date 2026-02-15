// src/app/workspace/[slug]/video/[roomId]/page.tsx
"use client";

import { useState, useEffect, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useVideoCall } from "@/hooks/useVideoCall";
import { VideoLobby } from "@/components/video/VideoLobby";
import { VideoChat } from "@/components/video/VideoChat";
import { ParticipantList } from "@/components/video/ParticipantList";
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    MonitorUp, MonitorOff, Copy, Check, Users, MessageSquare,
    Maximize, Minimize, Hand, Smile, LayoutGrid, Focus, PictureInPicture2, Wand2, X, Send
} from "lucide-react";
import { ConnectionQualityIndicator } from "@/components/video/ConnectionQualityIndicator";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useVirtualBackground } from "@/hooks/useVirtualBackground";
import { VideoControls } from "@/components/video/VideoControls";
import { toast } from "sonner";

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
    const [newMessage, setNewMessage] = useState("");

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

    // Audio Analysis
    const { isSpeaking } = useAudioAnalysis(localStream);

    // Virtual Background
    // Virtual Background
    const {
        processedStream,
        isBlurEnabled,
        toggleBlur,
        setBlurEnabled,
        isLoading: isBackgroundLoading
    } = useVirtualBackground(localStream);
    const activeStream = isBlurEnabled ? processedStream : localStream;

    // Use video call hook
    const {
        connected, peers, chatMessages, sendChatMessage: hookSendMessage,
        replaceVideoTrack, replaceAudioTrack, activeSpeakers, setLocalSpeaking
    } = useVideoCall({
        roomId: isInLobby ? "" : roomId,
        userId,
        userName,
        userImage,
        localStream: activeStream, // Use processed stream if enabled
    });

    // Sync speaking status
    useEffect(() => {
        setLocalSpeaking(isSpeaking);
    }, [isSpeaking, setLocalSpeaking]);

    // Update video track when background blur toggles
    useEffect(() => {
        if (activeStream) {
            const videoTrack = activeStream.getVideoTracks()[0];
            if (videoTrack) {
                replaceVideoTrack(videoTrack);
            }
        }
    }, [activeStream, replaceVideoTrack]);

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
    const handleJoinFromLobby = (stream: MediaStream | null, name: string, blurEnabled: boolean) => {
        setLocalStream(stream);
        setDisplayName(name);
        setIsInLobby(false);
        if (blurEnabled) {
            setBlurEnabled(true);
        }
        if (!stream) {
            setIsVideoOff(true);
            setIsMuted(true);
        }
        toast.success(`Joined room as ${name}`);
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

            // Restore original video
            if (originalVideoTrack && activeStream) {
                replaceVideoTrack(originalVideoTrack);
            }

            // Restore microphone audio (if mixed)
            if (localStream) {
                const micTrack = localStream.getAudioTracks()[0];
                if (micTrack) replaceAudioTrack(micTrack);
            }

            // Close audio context if exists
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }

        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
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

                    // Handle audio mixing
                    const screenAudioTrack = screenStream.getAudioTracks()[0];
                    if (screenAudioTrack && localStream) {
                        const micTrack = localStream.getAudioTracks()[0];
                        if (micTrack) {
                            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                            audioContextRef.current = ctx;
                            const dst = ctx.createMediaStreamDestination();

                            const micSrc = ctx.createMediaStreamSource(new MediaStream([micTrack]));
                            const screenSrc = ctx.createMediaStreamSource(new MediaStream([screenAudioTrack]));

                            micSrc.connect(dst);
                            screenSrc.connect(dst);

                            const mixedTrack = dst.stream.getAudioTracks()[0];
                            replaceAudioTrack(mixedTrack);
                        }
                    }

                    screenTrack.onended = () => {
                        setIsScreenSharing(false);
                        screenStreamRef.current = null;
                        if (originalVideoTrack) {
                            replaceVideoTrack(originalVideoTrack);
                        }
                        // Restore mic audio
                        if (localStream) {
                            const micTrack = localStream.getAudioTracks()[0];
                            if (micTrack) replaceAudioTrack(micTrack);
                        }
                        // Close context
                        if (audioContextRef.current) {
                            audioContextRef.current.close();
                            audioContextRef.current = null;
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

    const handleSendChatMessage = () => {
        if (!newMessage.trim()) return;
        hookSendMessage(newMessage);
        setNewMessage("");
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
            className="flex h-full flex-col bg-background relative overflow-hidden"
        >
            {/* Main Content */}
            <div className="flex-1 flex relative min-h-0 overflow-hidden">
                <div className={`flex-1 relative transition-all duration-300 ${showChat || showParticipants ? 'mr-80' : ''}`}>
                    <div className="absolute inset-0 p-4 overflow-y-auto">

                        {/* Waiting for others message */}
                        {peers.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                <div className="bg-secondary/50 p-8 rounded-full mb-4">
                                    <Users className="w-12 h-12 opacity-50" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Waiting for others to join...</h3>
                                <p className="text-sm max-w-md text-center">
                                    Share the invite link to start the meeting.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-6 gap-2"
                                    onClick={copyInviteLink}
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    Copy Invite Link
                                </Button>
                            </div>
                        )}

                        {viewMode === 'grid' ? (
                            <div className={`grid gap-4 h-full ${peers.length === 0 ? 'hidden' :
                                peers.length <= 1 ? 'grid-cols-1 md:grid-cols-2' :
                                    peers.length <= 3 ? 'grid-cols-2' :
                                        'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                                }`}>
                                {/* Local User (Grid) */}
                                <motion.div
                                    layout
                                    className={`relative bg-neutral-900 rounded-xl overflow-hidden shadow-lg border border-border ${activeSpeakers.has('local') ? 'ring-2 ring-emerald-500' : ''}`}
                                >
                                    <video
                                        ref={userVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className={`w-full h-full object-cover transform scale-x-[-1] ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                    {/* ... User Info Overlay ... */}
                                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-2">
                                        <span>{displayName} (You)</span>
                                        {isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                                    </div>
                                    {isVideoOff && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Avatar className="h-20 w-20">
                                                <AvatarImage src={userImage} />
                                                <AvatarFallback>{displayName?.[0]}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    )}
                                </motion.div>

                                {/* Peers (Grid) */}
                                {peers.map((peer) => (
                                    <div key={peer.socketId} className={`relative bg-neutral-900 rounded-xl overflow-hidden shadow-lg border border-border ${activeSpeakers.has(peer.socketId) ? 'ring-2 ring-emerald-500' : ''}`}>
                                        <VideoPlayer stream={peer.stream} isMuted={false} peerName={peer.userData.name} peerImage={peer.userData.image} />
                                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-2">
                                            <span>{peer.userData.name || 'Guest'}</span>
                                        </div>
                                        <div className="absolute top-3 right-3">
                                            <ConnectionQualityIndicator quality={peer.connectionQuality} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Speaker View
                            <div className="flex flex-col h-full gap-4">
                                {/* Active Speaker (Large) */}
                                <div className="flex-1 relative bg-neutral-900 rounded-xl overflow-hidden shadow-2xl border border-border">
                                    {/* Logic to show active speaker or local user */}
                                    {/* ... (Existing logic for speaker view) ... */}
                                    {/* To simplify replacement, I'll keep the structure but update container classes */}
                                    {peers.length > 0 ? (
                                        <VideoPlayer stream={peers[0].stream} isMuted={false} peerName={peers[0].userData.name} peerImage={peers[0].userData.image} />
                                    ) : (
                                        <video
                                            ref={userVideoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover transform scale-x-[-1]"
                                        />
                                    )}
                                </div>

                                {/* Filmstrip */}
                                <div className="h-32 flex gap-4 overflow-x-auto pb-2">
                                    <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-border flex-shrink-0">
                                        <video
                                            ref={userVideoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover transform scale-x-[-1]"
                                        />
                                        <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                                            You
                                        </div>
                                    </div>
                                    {peers.map((peer) => (
                                        <div key={peer.socketId} className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-border flex-shrink-0">
                                            <VideoPlayer stream={peer.stream} isMuted={false} peerName={peer.userData.name} peerImage={peer.userData.image} />
                                            <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                                                {peer.userData.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Side Panel (Chat/Participants) uses bg-card by default if using Sheet/Card ?? */}
                {/* The side panel is inline div in the original? No, it's absolute right-0 */}
                {(showChat || showParticipants) && (
                    <div className="absolute top-0 right-0 bottom-0 w-80 bg-background border-l border-border shadow-xl z-20 flex flex-col">
                        {/* ... Panel Content ... */}
                        {showChat && (
                            <div className="flex-1 flex flex-col h-full">
                                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                                    <h3 className="font-semibold">Chat</h3>
                                    <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}><X className="w-4 h-4" /></Button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className={`flex flex-col ${msg.userId === userId ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-3 py-2 rounded-lg max-w-[85%] ${msg.userId === userId
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-foreground'
                                                }`}>
                                                <p className="text-xs opacity-70 mb-0.5">{msg.userName}</p>
                                                <p className="text-sm">{msg.content}</p>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-1">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t border-border bg-background">
                                    <div className="flex gap-2">
                                        <Input
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                                            placeholder="Type a message..."
                                            className="bg-muted border-transparent focus:bg-background"
                                        />
                                        <Button size="icon" onClick={handleSendChatMessage} disabled={!newMessage.trim()}>
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showParticipants && (
                            <div className="flex-1 flex flex-col h-full">
                                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                                    <h3 className="font-semibold">Participants ({peers.length + 1})</h3>
                                    <Button variant="ghost" size="icon" onClick={() => setShowParticipants(false)}><X className="w-4 h-4" /></Button>
                                </div>
                                <div className="p-2">
                                    <div className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={userImage} />
                                            <AvatarFallback>{displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{displayName} (You)</p>
                                            <p className="text-xs text-muted-foreground">Host</p>
                                        </div>
                                        {isMuted ? <MicOff className="w-4 h-4 text-destructive" /> : <Mic className="w-4 h-4 text-emerald-500" />}
                                    </div>
                                    {peers.map(peer => (
                                        <div key={peer.socketId} className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{peer.userData.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{peer.userData.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls - Floating Bar */}
            <div className="absolute bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <div className="pointer-events-auto">
                    <VideoControls
                        isMuted={isMuted}
                        isVideoOff={isVideoOff}
                        isScreenSharing={isScreenSharing}
                        isBlurEnabled={isBlurEnabled}
                        showChat={showChat}
                        showParticipants={showParticipants}
                        onToggleMute={toggleMute}
                        onToggleVideo={toggleVideo}
                        onToggleScreenShare={toggleScreenShare}
                        onToggleBlur={toggleBlur}
                        onToggleChat={() => { setShowChat(!showChat); setShowParticipants(false); }}
                        onToggleParticipants={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
                        onToggleReactions={() => setShowReactions(!showReactions)}
                        onLeave={leaveCall}
                        onOpenSettings={() => toast.info("Device settings coming soon!")}
                    />
                </div>
            </div>

            {/* Top Bar for Mobile/Desktop */}
            <div className="absolute top-0 left-0 right-0 p-4 z-40 flex justify-between items-start pointer-events-none">
                {/* Meeting Info Pill */}
                <div className="pointer-events-auto bg-background/80 backdrop-blur rounded-full px-4 py-2 flex items-center gap-3 border border-border shadow-sm">
                    <span className="font-semibold text-foreground">{roomId.slice(0, 8)}...</span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${connected ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                        {connected ? 'LIVE' : 'CONNECTING'}
                    </span>
                </div>

                <div className="pointer-events-auto flex gap-2">
                    <Button variant="secondary" size="sm" onClick={copyInviteLink} className="rounded-full bg-background/80 backdrop-blur border border-border hover:bg-accent text-foreground shadow-sm">
                        {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        Invite
                    </Button>
                    <Button variant="secondary" size="icon" onClick={toggleViewMode} className="rounded-full bg-background/80 backdrop-blur border border-border hover:bg-accent text-foreground shadow-sm">
                        {viewMode === 'grid' ? <Focus className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function VideoPlayer({ stream, isMuted, peerName, peerImage }: { stream: MediaStream | null, isMuted: boolean, peerName?: string, peerImage?: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;

        if (stream) {
            // Always re-assign to handle stream identity changes
            if (el.srcObject !== stream) {
                el.srcObject = stream;
            }
            // Force play (browsers may block autoplay)
            el.play().catch(() => { });
        } else {
            el.srcObject = null;
        }
    }, [stream]);

    // Check if stream has active video tracks
    const hasVideo = stream && stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live');

    return (
        <div className="relative w-full h-full">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className={`w-full h-full object-cover ${!hasVideo ? 'hidden' : ''}`}
            />
            {!hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                    <div className="flex flex-col items-center gap-2">
                        <Avatar className="h-20 w-20">
                            {peerImage && <AvatarImage src={peerImage} />}
                            <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                                {peerName?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                        </Avatar>
                        {peerName && (
                            <span className="text-sm text-white/70 font-medium">{peerName}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
