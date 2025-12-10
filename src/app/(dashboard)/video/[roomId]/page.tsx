// src/app/(dashboard)/video/[roomId]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Mic, MicOff, Video, VideoOff,
    PhoneOff, Share, MonitorUp, Loader2,
    Users
} from "lucide-react";
import { getPusherClient } from "@/lib/pusher";

// Dynamically import simple-peer to avoid SSR issues
import dynamic from "next/dynamic";
import { PresenceChannel } from "pusher-js";

// Types
interface SignalData {
    signal: any;
    from: string;
}

interface UserData {
    id: string;
    info: {
        name: string;
        image: string;
    };
}

export default function VideoRoom({ params }: { params: Promise<{ roomId: string }> }) {
    const { data: session } = useSession();
    const router = useRouter();
    const [roomId, setRoomId] = useState<string>("");

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<any[]>([]); // SimplePeer instances
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // Remote stream refs
    const userVideo = useRef<HTMLVideoElement>(null);
    const remoteVideo = useRef<HTMLVideoElement>(null);
    const connectionRef = useRef<any>(null); // To store current peer connection

    // Status
    const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "waiting">("connecting");
    const [remoteUser, setRemoteUser] = useState<UserData | null>(null);

    // Unpack params
    useEffect(() => {
        params.then(p => setRoomId(p.roomId));
    }, [params]);

    // Initialize media stream
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                if (userVideo.current) {
                    userVideo.current.srcObject = currentStream;
                }
                setConnectionStatus("waiting");
            })
            .catch((err) => {
                console.error("Error accessing media devices:", err);
                alert("Could not access camera/microphone. Please check permissions.");
            });

        return () => {
            // Cleanup media stream on unmount
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Initialize Pusher and WebRTC
    useEffect(() => {
        if (!roomId || !stream || !session?.user) return;

        // Import simple-peer inside effect to avoid SSR
        import("simple-peer").then((module) => {
            const SimplePeer = module.default;
            startConnection(SimplePeer);
        });

        const pusher = getPusherClient();
        const channelName = `presence-video-${roomId}`;
        const channel = pusher.subscribe(channelName) as PresenceChannel;

        const startConnection = (SimplePeer: any) => {
            // Logged in user info
            const userId = session.user?.image ? session.user.image : // Hack: using image as ID if available or getting from session
                (session.user as any).id;

            // Handle new member joining
            channel.bind("pusher:member_added", (member: UserData) => {
                console.log("Member added:", member);
                setRemoteUser(member);
                setConnectionStatus("connecting");

                // Initiate call (I am the initiator)
                const peer = new SimplePeer({
                    initiator: true,
                    trickle: false,
                    stream: stream,
                });

                peer.on("signal", (data: any) => {
                    channel.trigger("client-signal", {
                        signal: data,
                        from: userId,
                    });
                });

                peer.on("stream", (remoteStream: MediaStream) => {
                    if (remoteVideo.current) {
                        remoteVideo.current.srcObject = remoteStream;
                    }
                });

                peer.on("connect", () => {
                    setConnectionStatus("connected");
                });

                peer.on("close", () => {
                    setConnectionStatus("waiting");
                    setRemoteUser(null);
                    if (remoteVideo.current) remoteVideo.current.srcObject = null;
                });

                connectionRef.current = peer;
            });

            // Handle signal from other peer
            channel.bind("client-signal", (data: SignalData) => {
                // If I am not the sender
                if (data.from === userId) return;

                // Be the receiver
                if (!connectionRef.current) {
                    // Incoming call
                    setConnectionStatus("connecting");
                    // Assuming we can get user info from channel members list if needed
                    // For now, just setting status

                    const peer = new SimplePeer({
                        initiator: false,
                        trickle: false,
                        stream: stream,
                    });

                    peer.on("signal", (signal: any) => {
                        channel.trigger("client-signal", {
                            signal: signal,
                            from: userId,
                        });
                    });

                    peer.on("stream", (remoteStream: MediaStream) => {
                        if (remoteVideo.current) {
                            remoteVideo.current.srcObject = remoteStream;
                        }
                    });

                    peer.on("connect", () => {
                        setConnectionStatus("connected");
                    });

                    peer.on("close", () => {
                        setConnectionStatus("waiting");
                        setRemoteUser(null);
                        if (remoteVideo.current) remoteVideo.current.srcObject = null;
                    });

                    peer.signal(data.signal);
                    connectionRef.current = peer;
                } else {
                    // Existing connection, processing signal (answer)
                    connectionRef.current.signal(data.signal);
                }
            });

            // Handle existing members (if I join 2nd)
            channel.bind("pusher:subscription_succeeded", (members: any) => {
                if (members.count > 1) {
                    // Someone is already here, wait for them to initiate?
                    // Or I initiate?
                    // Simple logic: The one who joins LATER initiates? No, earlier logic was `member_added` initiates.
                    // So if I join later, the `member_added` event fires for the EXISTING user? NO.
                    // `pusher:member_added` fires for existing members when *I* join.
                    // WAIT. 
                    // When User A is in channel. User B joins.
                    // User A receives `pusher:member_added` (User B key). A initiates call to B.
                    // User B receives subscription success. B waits for offer.

                    // So the current logic in `pusher:member_added` (User A side) is correct (Initiator=true).
                    // User B just needs to be ready to receive `client-signal`.

                    // Let's check members list to show who is there
                    members.each((member: any) => {
                        if (member.id !== userId) {
                            setRemoteUser(member);
                        }
                    });
                }
            });

            channel.bind("pusher:member_removed", (member: any) => {
                setRemoteUser(null);
                setConnectionStatus("waiting");
                if (connectionRef.current) {
                    connectionRef.current.destroy();
                    connectionRef.current = null;
                }
            });
        };

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
            if (connectionRef.current) {
                connectionRef.current.destroy();
            }
        };
    }, [roomId, stream, session]);

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) setIsMuted(!audioTrack.enabled);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) setIsVideoOff(!videoTrack.enabled);
        }
    };

    const leaveCall = () => {
        if (connectionRef.current) connectionRef.current.destroy();
        router.push("/video");
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
    };

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-neutral-900 text-white p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Meeting: {roomId.slice(0, 8)}...</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={copyInviteLink}>
                        <Users className="w-4 h-4 mr-2" />
                        Invite
                    </Button>
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Local Video */}
                <div className="relative bg-neutral-800 rounded-xl overflow-hidden shadow-2xl">
                    <video
                        playsInline
                        muted
                        ref={userVideo}
                        autoPlay
                        className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                    />
                    {isVideoOff && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={session?.user?.image || ""} />
                                <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
                            </Avatar>
                        </div>
                    )}
                    <div className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded text-sm font-medium">
                        You {isMuted && "(Muted)"}
                    </div>
                </div>

                {/* Remote Video */}
                <div className="relative bg-neutral-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
                    {connectionStatus === "connected" ? (
                        <>
                            <video
                                playsInline
                                ref={remoteVideo}
                                autoPlay
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded text-sm font-medium">
                                {remoteUser?.info?.name || "Remote User"}
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-6">
                            {connectionStatus === "connecting" ? (
                                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                            ) : (
                                <Users className="w-12 h-12 mx-auto mb-4 text-neutral-500" />
                            )}
                            <h3 className="text-xl font-semibold mb-2">
                                {connectionStatus === "connecting" ? "Connecting..." : "Waiting for others"}
                            </h3>
                            <p className="text-neutral-400">
                                Share the link to invite someone to this call.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4 py-4 bg-neutral-800/50 rounded-2xl backdrop-blur-sm">
                <Button
                    variant={isMuted ? "destructive" : "secondary"}
                    size="lg"
                    className="rounded-full h-14 w-14 p-0"
                    onClick={toggleMute}
                >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                <Button
                    variant={isVideoOff ? "destructive" : "secondary"}
                    size="lg"
                    className="rounded-full h-14 w-14 p-0"
                    onClick={toggleVideo}
                >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </Button>

                {/* Screen Share (Placeholder - complex to implement in one go)
                <Button
                    variant={isScreenSharing ? "default" : "secondary"}
                    size="lg"
                    className="rounded-full h-14 w-14 p-0"
                    onClick={() => setIsScreenSharing(!isScreenSharing)}
                >
                    <MonitorUp className="w-6 h-6" />
                </Button>
                */}

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
    );
}
