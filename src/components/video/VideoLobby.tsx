
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Mic, MicOff, Video, VideoOff,
    Loader2, ArrowRight, AlertCircle, Wand2, Settings2, Sparkles
} from "lucide-react";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useVirtualBackground } from "@/hooks/useVirtualBackground";

interface VideoLobbyProps {
    userName: string;
    userImage: string;
    roomId: string;
    onJoin: (stream: MediaStream | null, displayName: string, isBlurEnabled: boolean) => void;
}

export function VideoLobby({ userName, userImage, roomId, onJoin }: VideoLobbyProps) {
    const [displayName, setDisplayName] = useState(userName || "");
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Device Selection State
    const { cameras, microphones, speakers, refreshDevices } = useMediaDevices();
    const [selectedCameraId, setSelectedCameraId] = useState<string>("");
    const [selectedMicId, setSelectedMicId] = useState<string>("");
    const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>("");

    const videoRef = useRef<HTMLVideoElement>(null);

    // Audio Analysis & Virtual Background
    const { volume } = useAudioAnalysis(localStream);
    const [blurEnabled, setBlurEnabled] = useState(false);
    const { processedStream, toggleBlur: toggleBlurHook, isBlurEnabled: isHookBlurEnabled, isLoading: isBlurLoading } = useVirtualBackground(localStream, blurEnabled);

    // Only set defaults once devices are loaded
    useEffect(() => {
        if (!selectedCameraId && cameras.length > 0) setSelectedCameraId(cameras[0].deviceId);
        if (!selectedMicId && microphones.length > 0) setSelectedMicId(microphones[0].deviceId);
        if (!selectedSpeakerId && speakers.length > 0) setSelectedSpeakerId(speakers[0].deviceId);
    }, [cameras, microphones, speakers]);

    // Initialize media when selection changes
    useEffect(() => {
        const initMedia = async () => {
            setIsLoading(true);
            setError(null);

            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }

            try {
                const constraints = {
                    video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
                    audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                setLocalStream(stream);
                setIsLoading(false);
                setIsVideoOff(false);
                setIsMuted(false);
                refreshDevices();
            } catch (err: any) {
                console.error("Error accessing media:", err);
                setError("Could not access camera/microphone.");
                setIsLoading(false);
            }
        };

        if (selectedCameraId || selectedMicId) {
            initMedia();
        } else {
            // Initial load (default devices)
            initMedia();
        }
    }, [selectedCameraId, selectedMicId]);


    // Bind video stream
    useEffect(() => {
        if (videoRef.current) {
            const streamToDisplay = (isHookBlurEnabled && processedStream) ? processedStream : localStream;
            if (streamToDisplay) {
                videoRef.current.srcObject = streamToDisplay;
            }
        }
    }, [localStream, processedStream, isHookBlurEnabled]);

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

    const handleToggleBlur = () => {
        setBlurEnabled(!blurEnabled);
        toggleBlurHook();
    };

    const handleJoin = () => {
        // Pass the stream and blur state
        // Note: We stop the local preview stream tracks? 
        // No, we pass the stream to the room. The room will take ownership.
        // Wait, if we unmount Lobby, localStream (state) is lost if not passed properly?
        // onJoin takes the stream. React state update in parent will hold it.
        onJoin(localStream, displayName, isHookBlurEnabled);
    };

    const handleJoinWithoutMedia = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        onJoin(null, displayName, false);
    };

    return (
        <div className="flex h-full min-h-[calc(100vh-4rem)] items-center justify-center bg-background p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center"
            >
                {/* Left: Preview */}
                <div className="space-y-4">
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-border shadow-2xl ring-1 ring-white/10 dark:ring-white/10 ring-black/10">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        ) : error ? (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <div className="text-center p-4">
                                    <AlertCircle className="w-10 h-10 mx-auto mb-2 text-destructive" />
                                    <p>{error}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                                />
                                {isVideoOff && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                                        <Avatar className="h-24 w-24">
                                            <AvatarImage src={userImage} />
                                            <AvatarFallback className="text-3xl bg-primary/20 text-primary">
                                                {displayName?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Audio Visualizer Overlay - Keep this dark for contrast over video */}
                        <div className="absolute bottom-4 left-4 right-4 flex gap-4 items-center">
                            <div className="bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 border border-white/10">
                                {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className={`w-4 h-4 ${volume > 10 ? 'text-green-400' : 'text-neutral-400'}`} />}
                                {/* Simple visualizer bar */}
                                <div className="w-20 h-1.5 bg-neutral-700/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 transition-all duration-100"
                                        style={{ width: `${Math.min((volume / 50) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex-1" />

                            <Button
                                variant="secondary"
                                size="sm"
                                className="bg-black/50 backdrop-blur-md border border-white/10 hover:bg-black/70 rounded-full h-8 px-3 gap-2 text-white"
                                onClick={handleToggleBlur}
                                disabled={isVideoOff}
                            >
                                <Sparkles className={`w-3.5 h-3.5 ${isHookBlurEnabled ? 'text-purple-400' : 'text-neutral-400'}`} />
                                <span className="text-xs">{isHookBlurEnabled ? 'Blur On' : 'Blur Off'}</span>
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-1">
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Camera</label>
                            <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
                                <SelectTrigger className="bg-background border-input text-sm">
                                    <SelectValue placeholder="Select Camera" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cameras.length > 0 ? cameras.map(device => (
                                        <SelectItem key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                                        </SelectItem>
                                    )) : <SelectItem value="none" disabled>No cameras found</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-1">
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Microphone</label>
                            <Select value={selectedMicId} onValueChange={setSelectedMicId}>
                                <SelectTrigger className="bg-background border-input text-sm">
                                    <SelectValue placeholder="Select Mic" />
                                </SelectTrigger>
                                <SelectContent>
                                    {microphones.length > 0 ? microphones.map(device => (
                                        <SelectItem key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Mic ${device.deviceId.slice(0, 5)}...`}
                                        </SelectItem>
                                    )) : <SelectItem value="none" disabled>No mics found</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="flex flex-col justify-center space-y-8 p-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Join Meeting</h1>
                        <p className="text-muted-foreground">
                            Check your audio and video settings before joining.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Display Name</label>
                            <Input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="h-12 bg-background border-input"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                size="lg"
                                className="flex-1 h-14 font-semibold text-lg"
                                onClick={handleJoin}
                                disabled={!displayName.trim() || isLoading}
                            >
                                Join Now
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>

                            <div className="flex gap-2">
                                <Button
                                    size="icon"
                                    variant={isMuted ? "destructive" : "secondary"}
                                    className="h-14 w-14 rounded-xl"
                                    onClick={toggleMute}
                                >
                                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                </Button>
                                <Button
                                    size="icon"
                                    variant={isVideoOff ? "destructive" : "secondary"}
                                    className="h-14 w-14 rounded-xl"
                                    onClick={toggleVideo}
                                >
                                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                                </Button>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full text-muted-foreground hover:text-foreground"
                            onClick={handleJoinWithoutMedia}
                        >
                            Join without audio/video
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// Helper to flip the video horizontally
const styles = `
video {
    transform: scaleX(-1);
}
`;
