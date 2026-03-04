import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Loader2,
  AlertCircle,
  Sparkles,
  MoreVertical,
} from "lucide-react";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useVirtualBackground } from "@/hooks/useVirtualBackground";

interface VideoLobbyProps {
  userName: string;
  userImage: string;
  roomId: string;
  onJoin: (
    stream: MediaStream | null,
    displayName: string,
    isBlurEnabled: boolean,
  ) => void;
}

export function VideoLobby({
  userName,
  userImage,
  roomId,
  onJoin,
}: VideoLobbyProps) {
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
  const {
    processedStream,
    toggleBlur: toggleBlurHook,
    isBlurEnabled: isHookBlurEnabled,
    isLoading: isBlurLoading,
  } = useVirtualBackground(localStream, blurEnabled);

  // Only set defaults once devices are loaded
  useEffect(() => {
    if (!selectedCameraId && cameras.length > 0)
      setSelectedCameraId(cameras[0].deviceId);
    if (!selectedMicId && microphones.length > 0)
      setSelectedMicId(microphones[0].deviceId);
    if (!selectedSpeakerId && speakers.length > 0)
      setSelectedSpeakerId(speakers[0].deviceId);
  }, [cameras, microphones, speakers]);

  // Initialize media when selection changes
  useEffect(() => {
    const initMedia = async () => {
      setIsLoading(true);
      setError(null);

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      try {
        const constraints = {
          video: selectedCameraId
            ? { deviceId: { exact: selectedCameraId } }
            : true,
          audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
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

    initMedia();
  }, [selectedCameraId, selectedMicId]);

  // Bind video stream
  useEffect(() => {
    if (videoRef.current) {
      const streamToDisplay =
        isHookBlurEnabled && processedStream ? processedStream : localStream;
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
    onJoin(localStream, displayName, isHookBlurEnabled);
  };

  const handleJoinWithoutMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    onJoin(null, displayName, false);
  };

  return (
    <div className="flex h-full items-center justify-center bg-[#202124] p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl grid lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-12 items-center"
      >
        {/* ─── Left: Video Preview (Google Meet style) ─── */}
        <div className="space-y-5">
          {/* Name tag on video */}
          <div className="relative aspect-video bg-[#3c4043] rounded-2xl overflow-hidden shadow-2xl border border-[#5f6368]/30">
            {/* Name overlay */}
            <div className="absolute top-3 left-3 z-10 bg-black/40 backdrop-blur-sm rounded-md px-3 py-1">
              <span className="text-sm text-white font-medium uppercase tracking-wide">
                {displayName || "Your Name"}
              </span>
            </div>

            {/* Three-dot menu */}
            <button className="absolute top-3 right-3 z-10 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>

            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-4">
                <AlertCircle className="w-10 h-10 text-white/60" />
                <div>
                  <p className="text-white/90 text-lg mb-1">
                    Do you want people to see and hear you in the meeting?
                  </p>
                  <button
                    className="bg-[#1a73e8] text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-[#1765cc] transition-colors mt-2"
                    onClick={() => {
                      setSelectedCameraId("");
                      setSelectedMicId("");
                    }}
                  >
                    Allow microphone and camera
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${isVideoOff ? "opacity-0" : "opacity-100"}`}
                />
                {isVideoOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#3c4043]">
                    <Avatar className="h-20 w-20 ring-2 ring-white/10">
                      <AvatarImage src={userImage} />
                      <AvatarFallback className="text-3xl bg-[#5f6368] text-white font-medium">
                        {displayName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </>
            )}

            {/* Bottom controls on video — Google Meet style circular buttons */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 z-10">
              {/* Mic toggle */}
              <div className="relative">
                <button
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isMuted
                      ? "bg-[#ea4335] hover:bg-[#d33426]"
                      : "bg-[#3c4043] hover:bg-[#4a4d51]"
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-5 h-5 text-white" />
                  ) : (
                    <Mic className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>

              {/* Video toggle */}
              <div className="relative">
                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isVideoOff
                      ? "bg-[#ea4335] hover:bg-[#d33426]"
                      : "bg-[#3c4043] hover:bg-[#4a4d51]"
                  }`}
                >
                  {isVideoOff ? (
                    <VideoOff className="w-5 h-5 text-white" />
                  ) : (
                    <Video className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>

              <div className="flex-1" />

              {/* Effects button */}
              <button
                onClick={handleToggleBlur}
                disabled={isVideoOff}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isHookBlurEnabled
                    ? "bg-[#8ab4f8] hover:bg-[#7aa8f0]"
                    : "bg-[#3c4043] hover:bg-[#4a4d51]"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Sparkles
                  className={`w-5 h-5 ${isHookBlurEnabled ? "text-[#202124]" : "text-white"}`}
                />
              </button>
            </div>

            {/* Audio level indicator — subtle bar */}
            {!isMuted && !error && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent">
                <div
                  className="h-full bg-green-400 transition-all duration-100"
                  style={{ width: `${Math.min((volume / 50) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Device selectors — Google Meet style pill selectors */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-2.5 mt-2">
            {/* Microphone */}
            <Select value={selectedMicId} onValueChange={setSelectedMicId}>
              <SelectTrigger className="h-9 bg-transparent border border-[#5f6368] rounded-full text-[#e8eaed] text-xs px-3.5 w-[200px] hover:bg-[#3c4043] transition-colors overflow-hidden">
                <div className="flex items-center gap-2 w-full truncate">
                  <Mic className="w-3.5 h-3.5 text-[#9aa0a6] shrink-0" />
                  <span className="truncate flex-1 text-left">
                    <SelectValue placeholder="Microphone" />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#2d2e30] border-[#5f6368] text-[#e8eaed]">
                {microphones.length > 0 ? (
                  microphones.map((device) => (
                    <SelectItem
                      key={device.deviceId}
                      value={device.deviceId}
                      className="text-xs hover:bg-[#3c4043] focus:bg-[#3c4043] max-w-[280px]"
                    >
                      <span className="truncate block">
                        {device.label || `Mic ${device.deviceId.slice(0, 5)}...`}
                      </span>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No mics found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Speaker */}
            {speakers.length > 0 && (
              <Select
                value={selectedSpeakerId}
                onValueChange={setSelectedSpeakerId}
              >
                <SelectTrigger className="h-9 bg-transparent border border-[#5f6368] rounded-full text-[#e8eaed] text-xs px-3.5 w-[200px] hover:bg-[#3c4043] transition-colors overflow-hidden">
                  <div className="flex items-center gap-2 w-full truncate">
                    <span className="text-[#9aa0a6] text-[13px] shrink-0">🔊</span>
                    <span className="truncate flex-1 text-left">
                      <SelectValue placeholder="Speaker" />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#2d2e30] border-[#5f6368] text-[#e8eaed]">
                  {speakers.map((device) => (
                    <SelectItem
                      key={device.deviceId}
                      value={device.deviceId}
                      className="text-xs hover:bg-[#3c4043] focus:bg-[#3c4043] max-w-[280px]"
                    >
                      <span className="truncate block">
                        {device.label ||
                          `Speaker ${device.deviceId.slice(0, 5)}...`}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Camera */}
            <Select
              value={selectedCameraId}
              onValueChange={setSelectedCameraId}
            >
              <SelectTrigger className="h-9 bg-transparent border border-[#5f6368] rounded-full text-[#e8eaed] text-xs px-3.5 w-[200px] hover:bg-[#3c4043] transition-colors overflow-hidden">
                <div className="flex items-center gap-2 w-full truncate">
                  <Video className="w-3.5 h-3.5 text-[#9aa0a6] shrink-0" />
                  <span className="truncate flex-1 text-left">
                    <SelectValue placeholder="Camera" />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#2d2e30] border-[#5f6368] text-[#e8eaed]">
                {cameras.length > 0 ? (
                  cameras.map((device) => (
                    <SelectItem
                      key={device.deviceId}
                      value={device.deviceId}
                      className="text-xs hover:bg-[#3c4043] focus:bg-[#3c4043] max-w-[280px]"
                    >
                      <span className="truncate block">
                        {device.label ||
                          `Camera ${device.deviceId.slice(0, 5)}...`}
                      </span>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No cameras found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ─── Right: Join Panel (Google Meet style) ─── */}
        <div className="flex flex-col items-center text-center space-y-6 px-4 lg:px-8">
          <h1 className="text-2xl font-normal text-[#e8eaed]">
            Ready to join?
          </h1>

          {/* Display name input */}
          <div className="w-full max-w-[280px] space-y-1.5">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-12 bg-transparent border-[#5f6368] text-[#e8eaed] text-center rounded-md placeholder:text-[#9aa0a6] focus-visible:border-[#8ab4f8] focus-visible:ring-1 focus-visible:ring-[#8ab4f8] transition-all"
              placeholder="Your name"
            />
          </div>

          {/* Join button — Google Meet's blue pill */}
          <Button
            className="h-12 px-8 rounded-full bg-[#1a73e8] hover:bg-[#1765cc] text-white font-medium text-base shadow-none border-0 min-w-[200px]"
            onClick={handleJoin}
            disabled={!displayName.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Join now"
            )}
          </Button>

          {/* Secondary options */}
          <div className="space-y-2">
            <button
              className="text-sm text-[#8ab4f8] hover:text-[#aecbfa] transition-colors cursor-pointer"
              onClick={handleJoinWithoutMedia}
            >
              Join without audio/video
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
