// src/app/workspace/[slug]/video/[roomId]/page.tsx
// Custom WebRTC video room — Pixel-perfect Google Meet UI
"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  use,
} from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VideoLobby } from "@/components/video/VideoLobby";
import { VideoControls } from "@/components/video/VideoControls";
import { VideoChat } from "@/components/video/VideoChat";
import { ParticipantList } from "@/components/video/ParticipantList";
import { MeetingDetailsSidebar } from "@/components/video/MeetingDetailsSidebar";
import { HostControlsSidebar } from "@/components/video/HostControlsSidebar";
import { DeviceSettingsModal } from "@/components/video/DeviceSettingsModal";
import { BackgroundEffectsPanel } from "@/components/video/BackgroundEffectsPanel";
import { ConnectionQualityIndicator } from "@/components/video/ConnectionQualityIndicator";
import { WaitingRoomToast } from "@/components/video/WaitingRoomToast";
import { PollPanel } from "@/components/video/PollPanel";
import { Whiteboard } from "@/components/video/Whiteboard";
import { useVideoCall, type Reaction } from "@/hooks/useVideoCall";
import { useVirtualBackground } from "@/hooks/useVirtualBackground";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useMeetingRecorder } from "@/hooks/useMeetingRecorder";
import { useNoiseSuppression } from "@/hooks/useNoiseSuppression";
import { useAdaptiveBitrate } from "@/hooks/useAdaptiveBitrate";
import {
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Users,
  Lock,
  Mic,
  MicOff,
  VideoOff as VideoOffIcon,
  LayoutGrid,
  Presentation,
  Pin,
  PinOff,
  PictureInPicture2,
  Hand,
  Info,
  MessageSquare,
  Captions,
  Play,
  VideoOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Google Meet gradient palette — unique per user ───
const MEET_GRADIENTS = [
  "linear-gradient(135deg, #c62828 0%, #880e4f 100%)", // deep red → pink
  "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)", // royal blue
  "linear-gradient(135deg, #e65100 0%, #bf360c 100%)", // burnt orange
  "linear-gradient(135deg, #00695c 0%, #004d40 100%)", // teal
  "linear-gradient(135deg, #d84315 0%, #bf360c 100%)", // warm red-orange
  "linear-gradient(135deg, #ad1457 0%, #880e4f 100%)", // magenta
  "linear-gradient(135deg, #558b2f 0%, #33691e 100%)", // olive green
  "linear-gradient(135deg, #4527a0 0%, #311b92 100%)", // deep purple
  "linear-gradient(135deg, #00838f 0%, #006064 100%)", // cyan
  "linear-gradient(135deg, #6a1b9a 0%, #4a148c 100%)", // purple
  "linear-gradient(135deg, #ef6c00 0%, #e65100 100%)", // orange
  "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)", // forest green
];

const AVATAR_COLORS = [
  "#c62828",
  "#1565c0",
  "#e65100",
  "#00695c",
  "#d84315",
  "#ad1457",
  "#558b2f",
  "#4527a0",
  "#00838f",
  "#6a1b9a",
  "#ef6c00",
  "#2e7d32",
];

function getUserGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MEET_GRADIENTS[Math.abs(hash) % MEET_GRADIENTS.length];
}

function getUserColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface WorkspaceVideoRoomPageProps {
  params: Promise<{ slug: string; roomId: string }>;
}

type SidebarType = "chat" | "people" | "info" | "host" | null;

export default function WorkspaceVideoRoomPage({
  params,
}: WorkspaceVideoRoomPageProps) {
  const { slug, roomId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  // ─── UI State ───
  const [phase, setPhase] = useState<"lobby" | "call" | "summary">("lobby");
  const [activeSidebar, setActiveSidebar] = useState<SidebarType>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBlurEnabled, setIsBlurEnabled] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState("00:00");
  const [currentTime, setCurrentTime] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const [viewMode, setViewMode] = useState<"grid" | "speaker">("grid");
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [showPolls, setShowPolls] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const floatingVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const recognitionRef = useRef<any>(null);
  const captionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    processedStream,
    toggleBlur,
    isBlurEnabled: isHookBlurEnabled,
    backgroundMode,
    setBackgroundImage,
  } = useVirtualBackground(localStream, isBlurEnabled);
  const { volume } = useAudioAnalysis(localStream);
  const { isRecording, startRecording, stopRecording } = useMeetingRecorder();
  const { isEnabled: isNoiseSuppressionOn, enableSuppression, disableSuppression } = useNoiseSuppression();

  const {
    connected,
    peers,
    chatMessages,
    roomFull,
    sendChatMessage,
    replaceVideoTrack,
    replaceAudioTrack,
    activeSpeakers,
    setLocalSpeaking,
    handRaisedUsers,
    toggleHandRaise,
    reactions,
    sendReaction,
    reconnectingPeers,
    knockers,
    admitUser,
    rejectUser,
    updateDisplayName,
    polls,
    createPoll,
    votePoll,
  } = useVideoCall({
    roomId: phase === "call" ? roomId : "",
    userId: session?.user?.id || "",
    userName: displayName || session?.user?.name || "Guest",
    userImage: session?.user?.image || "",
    localStream: phase === "call" ? localStream : null,
  });

  // Adaptive bitrate — auto-adjust video quality based on network stats
  useAdaptiveBitrate(
    peers.map((p: any) => ({ socketId: p.socketId, connection: p.connection })),
    phase === "call"
  );

  // ─── Clock + Timer ───
  useEffect(() => {
    const tick = () =>
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      );
    tick();
    const interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (phase !== "call" || !callStartTime) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
      const hrs = Math.floor(diff / 3600);
      const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const secs = String(diff % 60).padStart(2, "0");
      setElapsed(hrs > 0 ? `${hrs}:${mins}:${secs}` : `${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, callStartTime]);

  // ─── Captions ───
  useEffect(() => {
    if (!isCaptionsOn) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setCaptionText("");
      return;
    }
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setIsCaptionsOn(false);
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e: any) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++)
        t += e.results[i][0].transcript;
      setCaptionText(t);
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
      captionTimeoutRef.current = setTimeout(() => setCaptionText(""), 5000);
    };
    recognition.onerror = () => {};
    recognition.onend = () => {
      if (isCaptionsOn && recognitionRef.current)
        try {
          recognition.start();
        } catch {}
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {}
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isCaptionsOn]);

  useEffect(() => {
    if (phase === "call") setLocalSpeaking(volume > 15);
  }, [volume, phase, setLocalSpeaking]);

  useEffect(() => {
    let s = localStream;
    if (isScreenSharing && screenStreamRef.current) {
      // Prioritize showing screen share so user sees what is presented
      s = screenStreamRef.current;
    } else if (isHookBlurEnabled && processedStream) {
      // Otherwise use hook-processed stream if blur is enabled
      s = processedStream;
    }

    if (localVideoRef.current && phase === "call" && s)
      localVideoRef.current.srcObject = s;
    if (floatingVideoRef.current && phase === "call" && s)
      floatingVideoRef.current.srcObject = s;
  }, [localStream, processedStream, isHookBlurEnabled, phase, isScreenSharing]);

  // ─── Chat Unread & Toasts ───
  const prevChatLen = useRef(0);
  useEffect(() => {
    if (chatMessages.length > prevChatLen.current) {
      if (activeSidebar !== "chat" && phase === "call") {
        const newMsgs = chatMessages.slice(prevChatLen.current);
        const otherUserMsgs = newMsgs.filter(
          (m) => m.userId !== (session?.user?.id || "local"),
        );
        if (otherUserMsgs.length > 0) {
          setUnreadCount((prev) => prev + otherUserMsgs.length);
          const latest = otherUserMsgs[otherUserMsgs.length - 1];
          toast.info(`New message from ${latest.userName}`, {
            description: latest.content,
            position: "bottom-left",
          });
        }
      }
    }
    prevChatLen.current = chatMessages.length;
  }, [chatMessages, activeSidebar, phase, session?.user?.id]);

  useEffect(() => {
    if (activeSidebar === "chat") setUnreadCount(0);
  }, [activeSidebar]);

  // ─── Handlers ───
  const handleJoinFromLobby = useCallback(
    (stream: MediaStream | null, name: string, blurEnabled: boolean) => {
      setLocalStream(stream);
      setDisplayName(name);
      setIsBlurEnabled(blurEnabled);
      setCallStartTime(new Date());
      if (stream) {
        const at = stream.getAudioTracks()[0],
          vt = stream.getVideoTracks()[0];
        setIsMuted(at ? !at.enabled : true);
        setIsVideoOff(vt ? !vt.enabled : true);
        if (vt) originalVideoTrackRef.current = vt;
      }
      setPhase("call");
    },
    [],
  );

  const handleToggleMute = useCallback(() => {
    if (localStream) {
      const t = localStream.getAudioTracks()[0];
      if (t) {
        t.enabled = !t.enabled;
        setIsMuted(!t.enabled);
      }
    }
  }, [localStream]);

  const handleToggleVideo = useCallback(async () => {
    if (!localStream) return;

    if (!isVideoOff) {
      // Turning OFF: Fully stop the hardware track to turn off the webcam light
      const t = localStream.getVideoTracks()[0];
      if (t) {
        t.stop();
        localStream.removeTrack(t);
      }
      if (originalVideoTrackRef.current) {
        originalVideoTrackRef.current.stop();
        originalVideoTrackRef.current = null;
      }
      setIsVideoOff(true);
    } else {
      // Turning ON: Request a new camera stream
      try {
        // Ensure old tracks are completely stopped to prevent NotReadableError hardware locks
        if (originalVideoTrackRef.current) {
          originalVideoTrackRef.current.stop();
        }
        if (localStream) {
          localStream.getVideoTracks().forEach(t => t.stop());
        }

        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = s.getVideoTracks()[0];
        originalVideoTrackRef.current = newVideoTrack;

        localStream.addTrack(newVideoTrack);
        replaceVideoTrack(newVideoTrack);
        setIsVideoOff(false);

        // Force state update so UI and hooks receive the newly attached track
        setLocalStream(new MediaStream(localStream.getTracks()));
      } catch (err) {
        console.error("Failed to re-engage video:", err);
      }
    }
  }, [localStream, isVideoOff, replaceVideoTrack]);

  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      if (originalVideoTrackRef.current)
        replaceVideoTrack(originalVideoTrackRef.current);
      setIsScreenSharing(false);
    } else {
      try {
        const s = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = s;
        const vt = s.getVideoTracks()[0];
        replaceVideoTrack(vt);
        const at = s.getAudioTracks()[0];
        if (at) replaceAudioTrack(at);
        vt.onended = () => {
          if (originalVideoTrackRef.current)
            replaceVideoTrack(originalVideoTrackRef.current);
          screenStreamRef.current = null;
          setIsScreenSharing(false);
        };
        setIsScreenSharing(true);
      } catch {}
    }
  }, [isScreenSharing, replaceVideoTrack, replaceAudioTrack]);

  const handleToggleBlur = useCallback(() => {
    setShowBgPanel(true);
  }, []);

  const handleToggleNoiseSuppression = useCallback(() => {
    if (!localStream) return;
    if (isNoiseSuppressionOn) {
      const original = disableSuppression();
      if (original) {
        const audioTrack = original.getAudioTracks()[0];
        if (audioTrack) replaceAudioTrack(audioTrack);
      }
    } else {
      const processed = enableSuppression(localStream);
      const audioTrack = processed.getAudioTracks()[0];
      if (audioTrack) replaceAudioTrack(audioTrack);
    }
  }, [localStream, isNoiseSuppressionOn, enableSuppression, disableSuppression, replaceAudioTrack]);
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(
      `${window.location.origin}/workspace/${slug}/video/${roomId}`,
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [slug, roomId]);
  const handleLeave = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (originalVideoTrackRef.current) {
      originalVideoTrackRef.current.stop();
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    recognitionRef.current?.stop();
    setPhase("summary");
  }, [localStream]);
  const handleTogglePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (localVideoRef.current) {
        await localVideoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch {}
  }, []);
  const handleToggleView = useCallback(
    () => setViewMode((p) => (p === "grid" ? "speaker" : "grid")),
    [],
  );
  const handlePinUser = useCallback(
    (userId: string) => {
      setPinnedUserId((p) => (p === userId ? null : userId));
      if (viewMode === "grid") setViewMode("speaker");
    },
    [viewMode],
  );

  const handleDeviceChange = useCallback(
    async (kind: "audioinput" | "videoinput" | "audiooutput", deviceId: string) => {
      try {
        if (kind === "audioinput") {
          // Stop old track first
          if (localStream) {
            const oldAudio = localStream.getAudioTracks()[0];
            if (oldAudio) { oldAudio.stop(); localStream.removeTrack(oldAudio); }
          }
          const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
          const newAudioTrack = stream.getAudioTracks()[0];
          if (localStream) {
            localStream.addTrack(newAudioTrack);
            replaceAudioTrack(newAudioTrack);
            setLocalStream(new MediaStream(localStream.getTracks()));
          }
        } else if (kind === "videoinput") {
          // Stop old track first to release hardware lock
          if (originalVideoTrackRef.current) {
            originalVideoTrackRef.current.stop();
          }
          if (localStream) {
            const oldVideo = localStream.getVideoTracks()[0];
            if (oldVideo) { oldVideo.stop(); localStream.removeTrack(oldVideo); }
          }
          const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
          const newVideoTrack = stream.getVideoTracks()[0];
          if (localStream) {
            localStream.addTrack(newVideoTrack);
            originalVideoTrackRef.current = newVideoTrack;
            replaceVideoTrack(newVideoTrack);
            setIsVideoOff(false);
            setLocalStream(new MediaStream(localStream.getTracks()));
          }
        } else if (kind === "audiooutput") {
          // Set sink on all video elements
          const videos = document.querySelectorAll("video");
          for (const v of videos) {
            if ((v as any).setSinkId) await (v as any).setSinkId(deviceId);
          }
        }
      } catch (err) {
        console.error("Failed to switch device:", err);
        toast.error("Failed to switch device.");
      }
    },
    [localStream, replaceAudioTrack, replaceVideoTrack],
  );

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (!videoEl) return;
    const onEnter = () => setIsPiPActive(true);
    const onLeave = () => setIsPiPActive(false);
    videoEl.addEventListener("enterpictureinpicture", onEnter);
    videoEl.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      videoEl.removeEventListener("enterpictureinpicture", onEnter);
      videoEl.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, [phase]);

  // ─── Keyboard Shortcuts ───
  useEffect(() => {
    if (phase !== "call") return;
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      // Ctrl+D — Toggle microphone
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        handleToggleMute();
      }
      // Ctrl+E — Toggle camera
      if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        handleToggleVideo();
      }
      // Ctrl+Shift+H — Raise/lower hand
      if (e.ctrlKey && e.shiftKey && (e.key === "H" || e.key === "h")) {
        e.preventDefault();
        toggleHandRaise();
      }
      // Ctrl+Shift+S — Toggle screen share
      if (e.ctrlKey && e.shiftKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        handleToggleScreenShare();
      }
      // Ctrl+Shift+C — Toggle captions
      if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        setIsCaptionsOn(p => !p);
      }
      // F11 or Ctrl+Shift+F — Toggle fullscreen
      if (e.key === "F11" || (e.ctrlKey && e.shiftKey && (e.key === "F" || e.key === "f"))) {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, handleToggleMute, handleToggleVideo, toggleHandRaise, handleToggleScreenShare, handleToggleFullscreen]);

  // ─── Automatic PiP on Tab Switch ───
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "hidden" &&
        phase === "call" &&
        !document.pictureInPictureElement
      ) {
        // Find a valid video element to PiP (spotlight peer or someone speaking)
        const videos = document.querySelectorAll("video");
        // Let's try to PiP the first active peer video we can find, or local if none
        const targetVideo =
          Array.from(videos).find(
            (v) => v !== localVideoRef.current && v.readyState >= 2,
          ) || localVideoRef.current;
        if (targetVideo) {
          try {
            await (targetVideo as HTMLVideoElement).requestPictureInPicture();
          } catch (e) {
            /* ignore PiP block */
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [phase]);

  const myId = session?.user?.id || "local";
  const myName = displayName || session?.user?.name || "You";
  const myImage = session?.user?.image || "";
  const participantsList = [
    {
      id: myId,
      name: myName,
      image: myImage,
      isMuted,
      isVideoOff,
      isHost: true,
    },
    ...peers.map((p) => ({
      id: p.userData.id,
      name: p.userData.name,
      image: p.userData.image,
      isMuted: false,
      isVideoOff: !p.stream
        ?.getVideoTracks()
        .some((t: MediaStreamTrack) => t.enabled),
    })),
  ];
  const spotlightUserId =
    pinnedUserId ||
    [...activeSpeakers].find((id) => id !== myId) ||
    (peers.length > 0 ? peers[0].userData.id : myId);
  const totalParticipants = 1 + peers.length;
  const sidebarOpen = activeSidebar !== null;

  // ─── Lobby ───
  if (phase === "lobby")
    return (
      <VideoLobby
        userName={session?.user?.name || ""}
        userImage={myImage}
        roomId={roomId}
        onJoin={handleJoinFromLobby}
      />
    );

  // ─── Summary Screen ───
  if (phase === "summary") {
    const downloadTranscript = () => {
      const lines = chatMessages.map(
        (m) =>
          `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.userName}: ${m.content}`
      );
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-${roomId}-transcript.txt`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#202124] relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a73e8]/5 via-transparent to-[#8ab4f8]/5" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8 p-8 max-w-lg relative z-10"
        >
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a73e8]/20 to-[#8ab4f8]/10 flex items-center justify-center mx-auto border border-[#8ab4f8]/20"
          >
            <Check className="w-10 h-10 text-[#8ab4f8]" />
          </motion.div>

          <div>
            <h2 className="text-2xl font-medium text-[#e8eaed]">
              Meeting ended
            </h2>
            <p className="text-sm text-[#9aa0a6] mt-1">Thanks for joining!</p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "⏱️", label: "Duration", value: elapsed },
              { icon: "👥", label: "Participants", value: String(participantsList.length) },
              { icon: "💬", label: "Messages", value: String(chatMessages.length) },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-[#303134]/80 rounded-xl p-4 border border-[#5f6368]/20"
              >
                <span className="text-lg">{stat.icon}</span>
                <p className="text-xl font-semibold text-[#e8eaed] mt-1 tabular-nums">{stat.value}</p>
                <p className="text-[10px] text-[#5f6368] uppercase tracking-wider mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col gap-3 pt-2"
          >
            <div className="flex gap-3 justify-center">
              {chatMessages.length > 0 && (
                <button
                  onClick={downloadTranscript}
                  className="border border-[#5f6368]/40 text-[#8ab4f8] rounded-full px-5 py-2.5 text-sm font-medium hover:bg-[#8ab4f8]/10 hover:border-[#8ab4f8]/30 transition-all"
                >
                  📄 Download transcript
                </button>
              )}
              <button
                onClick={() => setPhase("lobby")}
                className="border border-[#5f6368]/40 text-[#e8eaed] rounded-full px-5 py-2.5 text-sm font-medium hover:bg-[#3c4043] transition-all"
              >
                🔄 Rejoin
              </button>
            </div>
            <button
              onClick={() => {
                window.close();
                setTimeout(() => router.push(`/workspace/${slug}/video`), 300);
              }}
              className="bg-[#1a73e8] text-white rounded-full px-8 py-3 text-sm font-semibold hover:bg-[#1765cc] transition-all shadow-lg shadow-[#1a73e8]/20 hover:shadow-xl hover:shadow-[#1a73e8]/30 mx-auto"
            >
              Return home
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── Room Full ───
  if (roomFull) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#202124]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4 p-8"
        >
          <div className="w-20 h-20 rounded-full bg-[#ea4335]/20 flex items-center justify-center mx-auto">
            <Users className="w-10 h-10 text-[#ea4335]" />
          </div>
          <h2 className="text-2xl font-normal text-[#e8eaed]">
            This meeting is full
          </h2>
          <p className="text-[#9aa0a6]">Maximum 6 participants reached.</p>
          <button
            onClick={() => router.push(`/workspace/${slug}/video`)}
            className="bg-[#1a73e8] text-white rounded-full px-6 py-2.5 text-sm font-medium hover:bg-[#1765cc]"
          >
            Go back
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Active Call ───
  return (
    <>
    <div
      ref={containerRef}
      className="flex flex-col h-screen bg-[#202124] relative select-none overflow-hidden"
    >
      <FloatingReactions reactions={reactions} />
      <Whiteboard isOpen={showWhiteboard} onClose={() => setShowWhiteboard(false)} roomId={roomId} />

      {/* ─── Recording Indicator ─── */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-3 left-4 z-30 flex items-center gap-2 bg-[#ea4335]/15 border border-[#ea4335]/30 rounded-full px-3.5 py-1.5 backdrop-blur-sm"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ea4335] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ea4335]" />
            </span>
            <span className="text-xs text-[#ea4335] font-medium">Recording</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Noise Suppression Indicator ─── */}
      <AnimatePresence>
        {isNoiseSuppressionOn && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-3 z-30 flex items-center gap-1.5 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-full px-3 py-1.5 backdrop-blur-sm"
            style={{ left: isRecording ? "170px" : "16px" }}
          >
            <span className="text-[10px] text-[#8ab4f8] font-medium">🔇 Noise suppression ON</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Top-right indicators (Google Meet style) ─── */}
      <div className="absolute top-3 right-4 z-30 flex items-center gap-2">
        {isVideoOff && (
          <div className="w-8 h-8 rounded-full bg-[#3c4043] flex items-center justify-center">
            <VideoOffIcon className="w-4 h-4 text-[#e8eaed]" />
          </div>
        )}
        <button
          onClick={() =>
            setActiveSidebar((prev) => (prev === "people" ? null : "people"))
          }
          className="flex items-center gap-1.5 bg-[#3c4043] rounded-full pl-1.5 pr-3 py-1 hover:bg-[#4a4d51] transition-colors"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={myImage} />
            <AvatarFallback className="text-[10px] bg-[#5f6368] text-white">
              {myName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-[#e8eaed] font-medium">
            {totalParticipants}
          </span>
        </button>
      </div>

      {/* ─── Video Grid ─── */}
      <div className="flex-1 relative min-h-0">
        <div
          className={cn(
            "h-full p-3 transition-all duration-300 ease-out",
            sidebarOpen && "pr-[324px]",
          )}
        >
          {viewMode === "grid" ? (
            <MeetGridView
              totalParticipants={totalParticipants}
              localVideoRef={localVideoRef}
              displayName={myName}
              userImage={myImage}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
              isPiPActive={isPiPActive}
              myId={myId}
              peers={peers}
              activeSpeakers={activeSpeakers}
              handRaisedUsers={handRaisedUsers}
              pinnedUserId={pinnedUserId}
              onPinUser={handlePinUser}
              reconnectingPeers={reconnectingPeers}
            />
          ) : (
            <MeetSpeakerView
              spotlightUserId={spotlightUserId}
              localVideoRef={localVideoRef}
              displayName={myName}
              userImage={myImage}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
              isPiPActive={isPiPActive}
              myId={myId}
              peers={peers}
              activeSpeakers={activeSpeakers}
              handRaisedUsers={handRaisedUsers}
              pinnedUserId={pinnedUserId}
              onPinUser={handlePinUser}
              reconnectingPeers={reconnectingPeers}
            />
          )}
        </div>

        <div
          className={cn(
            "transition-all duration-300 ease-out",
            activeSidebar
              ? "w-80 opacity-100 right-0 mr-4"
              : "w-0 opacity-0 -right-80 hidden",
          )}
        >
          <div className="bg-[#1e1f20] rounded-2xl h-full flex flex-col overflow-hidden border border-white/5 shadow-2xl">
            {activeSidebar === "chat" && (
              <VideoChat
                isOpen={activeSidebar === "chat"}
                currentUserId={myId}
                messages={chatMessages}
                onSendMessage={sendChatMessage}
                onClose={() => setActiveSidebar(null)}
              />
            )}
            {activeSidebar === "people" && (
              <ParticipantList
                isOpen={activeSidebar === "people"}
                participants={participantsList}
                currentUserId={myId}
                onClose={() => setActiveSidebar(null)}
              />
            )}
            {activeSidebar === "info" && (
              <MeetingDetailsSidebar
                isOpen={activeSidebar === "info"}
                onClose={() => setActiveSidebar(null)}
                joinUrl={
                  typeof window !== "undefined" ? window.location.href : ""
                }
                roomId={roomId}
              />
            )}
            {activeSidebar === "host" && (
              <HostControlsSidebar
                isOpen={activeSidebar === "host"}
                onClose={() => setActiveSidebar(null)}
              />
            )}
          </div>
        </div>

        {/* Floating self-view in speaker mode */}
        {viewMode === "speaker" && peers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "absolute bottom-20 z-20 w-48 h-32 rounded-lg overflow-hidden shadow-2xl border border-[#5f6368]/40 cursor-pointer group",
              sidebarOpen ? "right-[340px]" : "right-4",
            )}
            onClick={() => handlePinUser(myId)}
          >
            {isVideoOff ? (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: getUserGradient(myName) }}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={myImage} />
                  <AvatarFallback
                    className="text-lg font-medium text-white"
                    style={{ backgroundColor: getUserColor(myName) }}
                  >
                    {myName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <video
                ref={floatingVideoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  !isScreenSharing && !isPiPActive && "transform scale-x-[-1]",
                )}
              />
            )}
            <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-[#202124]/70 rounded px-1.5 py-0.5">
              {isMuted && <MicOff className="w-2.5 h-2.5 text-[#ea4335]" />}
              <span className="text-[10px] text-white font-medium">
                {myName}
              </span>
            </div>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3.5 h-3.5 text-white drop-shadow" />
            </div>
          </motion.div>
        )}
      </div>

      {/* ─── Captions ─── */}
      <AnimatePresence>
        {isCaptionsOn && captionText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 max-w-2xl px-6 py-3 bg-[#303134]/90 backdrop-blur rounded-lg"
          >
            <p className="text-[#e8eaed] text-sm text-center">{captionText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom Bar — Google Meet 3-column ─── */}
      <div className="h-[68px] sm:h-[56px] shrink-0 flex items-center px-2 sm:px-4 bg-[#202124] z-30 pb-3 sm:pb-0">
        {/* Left: Time | Meeting code */}
        <div className="hidden md:flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[13px] text-[#e8eaed]">{currentTime}</span>
          <span className="text-[#5f6368]">|</span>
          <span className="text-[13px] text-[#9aa0a6] truncate">{roomId}</span>
          {callStartTime && (
            <>
              <span className="text-[#5f6368]">|</span>
              <span className="flex items-center gap-1.5 text-[13px] text-[#e8eaed]">
                <span className="w-2 h-2 rounded-full bg-[#ea4335] animate-pulse" />
                {elapsed}
              </span>
            </>
          )}
        </div>
        {/* Mobile left spacer */}
        <div className="flex md:hidden flex-1 min-w-0" />

        {/* Center: Controls */}
        <VideoControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          isBlurEnabled={isHookBlurEnabled}
          isHandRaised={handRaisedUsers.has(myId)}
          isCaptionsOn={isCaptionsOn}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleBlur={handleToggleBlur}
          onToggleHandRaise={toggleHandRaise}
          onToggleCaptions={() => setIsCaptionsOn((p) => !p)}
          onSendReaction={sendReaction}
          onLeave={handleLeave}
          activeSidebar={activeSidebar}
          onToggleChat={() =>
            setActiveSidebar((prev) => (prev === "chat" ? null : "chat"))
          }
          onToggleParticipants={() =>
            setActiveSidebar((prev) => (prev === "people" ? null : "people"))
          }
          unreadChatCount={unreadCount}
          onToggleView={handleToggleView}
          onTogglePiP={handleTogglePiP}
          onOpenSettings={() => setShowSettings(true)}
          isRecording={isRecording}
          onToggleRecord={isRecording ? stopRecording : startRecording}
          onOpenPolls={() => setShowPolls(true)}
          isNoiseSuppressionOn={isNoiseSuppressionOn}
          onToggleNoiseSuppression={handleToggleNoiseSuppression}
          onOpenWhiteboard={() => setShowWhiteboard(p => !p)}
          isWhiteboardOpen={showWhiteboard}
        />

        {/* Right: Utility icons */}
        <div className="hidden sm:flex items-center gap-1 flex-1 justify-end min-w-0">
          <MeetIconBtn
            onClick={handleCopyLink}
            active={copiedLink}
            title="Meeting details"
          >
            {copiedLink ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </MeetIconBtn>
          <MeetIconBtn
            onClick={() =>
              setActiveSidebar((prev) => (prev === "chat" ? null : "chat"))
            }
            active={activeSidebar === "chat"}
            title="Chat"
          >
            <MessageSquare className="w-5 h-5" />
          </MeetIconBtn>
          <MeetIconBtn
            onClick={handleToggleView}
            title={viewMode === "grid" ? "Speaker view" : "Grid view"}
          >
            {viewMode === "grid" ? (
              <Presentation className="w-5 h-5" />
            ) : (
              <LayoutGrid className="w-5 h-5" />
            )}
          </MeetIconBtn>
          <MeetIconBtn
            onClick={() =>
              setActiveSidebar((prev) => (prev === "host" ? null : "host"))
            }
            active={activeSidebar === "host"}
            title="Host controls"
          >
            <Lock className="w-5 h-5" />
          </MeetIconBtn>
        </div>
        {/* Mobile right spacer */}
        <div className="flex sm:hidden flex-1 justify-end min-w-0" />
      </div>
    </div>

    {/* ─── Device Settings Modal ─── */}
    <DeviceSettingsModal
      isOpen={showSettings}
      onClose={() => setShowSettings(false)}
      onDeviceChange={handleDeviceChange}
    />
    <BackgroundEffectsPanel
      isOpen={showBgPanel}
      onClose={() => setShowBgPanel(false)}
      backgroundMode={backgroundMode}
      onToggleBlur={toggleBlur}
      onSetBackgroundImage={setBackgroundImage}
    />
    <PollPanel
      isOpen={showPolls}
      onClose={() => setShowPolls(false)}
      polls={polls}
      userId={myId}
      onCreatePoll={createPoll}
      onVotePoll={votePoll}
    />
    <WaitingRoomToast
      knockers={knockers}
      onAdmit={admitUser}
      onReject={rejectUser}
    />
    </>
  );
}

// ─── Meet-style icon button ───
const MeetIconBtn = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(({ children, active, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer",
        active
          ? "bg-[#8ab4f8] text-[#202124]"
          : "text-[#e8eaed] hover:bg-[#3c4043]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
MeetIconBtn.displayName = "MeetIconBtn";

// ═══════════════════════════════════════════════════
// ─── Grid View (Google Meet 4×2 / 3×2 etc.) ───
// ═══════════════════════════════════════════════════

interface ViewProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  displayName: string;
  userImage: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isPiPActive: boolean;
  myId: string;
  peers: any[];
  activeSpeakers: Set<string>;
  handRaisedUsers: Set<string>;
  pinnedUserId: string | null;
  onPinUser: (id: string) => void;
  reconnectingPeers: Set<string>;
}

function MeetGridView({
  totalParticipants,
  ...props
}: ViewProps & { totalParticipants: number }) {
  // Responsive Google Meet Grid
  const gridClass =
    totalParticipants <= 1
      ? "grid-cols-1 max-w-3xl mx-auto"
      : totalParticipants === 2
        ? "grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto"
        : totalParticipants <= 4
          ? "grid-cols-1 sm:grid-cols-2"
          : totalParticipants <= 6
            ? "grid-cols-2 lg:grid-cols-3"
            : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-2 h-full w-full auto-rows-fr", gridClass)}>
      <MeetTile
        isLocal
        name={props.displayName}
        image={props.userImage}
        userId={props.myId}
        isMuted={props.isMuted}
        isVideoOff={props.isVideoOff}
        isActiveSpeaker={props.activeSpeakers.has(props.myId)}
        isHandRaised={props.handRaisedUsers.has(props.myId)}
        isPinned={props.pinnedUserId === props.myId}
        onPin={() => props.onPinUser(props.myId)}
      >
        {!props.isVideoOff && (
          <video
            ref={props.localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover",
              !props.isScreenSharing && !props.isPiPActive && "transform scale-x-[-1]",
            )}
          />
        )}
      </MeetTile>
      {props.peers.map((p) => (
        <PeerMeetTile
          key={p.socketId}
          peer={p}
          isActiveSpeaker={props.activeSpeakers.has(p.userData.id)}
          isHandRaised={props.handRaisedUsers.has(p.userData.id)}
          isPinned={props.pinnedUserId === p.userData.id}
          onPin={() => props.onPinUser(p.userData.id)}
          isReconnecting={props.reconnectingPeers.has(p.socketId)}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ─── Speaker View ───
// ═══════════════════════════════════════════════════

function MeetSpeakerView({
  spotlightUserId,
  ...props
}: ViewProps & { spotlightUserId: string }) {
  const isSpotlightLocal = spotlightUserId === props.myId;
  const spotlightPeer = props.peers.find(
    (p) => p.userData.id === spotlightUserId,
  );
  const thumbnailPeers = props.peers.filter(
    (p) => p.userData.id !== spotlightUserId,
  );
  const showLocal = !isSpotlightLocal;

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex-1 min-h-0">
        {isSpotlightLocal ? (
          <MeetTile
            isLocal
            name={props.displayName}
            image={props.userImage}
            userId={props.myId}
            isMuted={props.isMuted}
            isVideoOff={props.isVideoOff}
            isActiveSpeaker={props.activeSpeakers.has(props.myId)}
            isHandRaised={props.handRaisedUsers.has(props.myId)}
            isPinned={props.pinnedUserId === props.myId}
            onPin={() => props.onPinUser(props.myId)}
            className="h-full w-full"
          >
            {!props.isVideoOff && (
              <video
                ref={props.localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  !props.isScreenSharing && !props.isPiPActive && "transform scale-x-[-1]",
                )}
              />
            )}
          </MeetTile>
        ) : spotlightPeer ? (
          <PeerMeetTile
            peer={spotlightPeer}
            isActiveSpeaker={props.activeSpeakers.has(
              spotlightPeer.userData.id,
            )}
            isHandRaised={props.handRaisedUsers.has(spotlightPeer.userData.id)}
            isPinned={props.pinnedUserId === spotlightPeer.userData.id}
            onPin={() => props.onPinUser(spotlightPeer.userData.id)}
            isReconnecting={props.reconnectingPeers.has(spotlightPeer.socketId)}
            className="h-full w-full"
          />
        ) : null}
      </div>
      {(showLocal || thumbnailPeers.length > 0) && (
        <div className="flex gap-2 h-28 shrink-0 overflow-x-auto">
          {showLocal && (
            <MeetTile
              isLocal
              name={props.displayName}
              image={props.userImage}
              userId={props.myId}
              isMuted={props.isMuted}
              isVideoOff={props.isVideoOff}
              isActiveSpeaker={props.activeSpeakers.has(props.myId)}
              isHandRaised={props.handRaisedUsers.has(props.myId)}
              isPinned={props.pinnedUserId === props.myId}
              onPin={() => props.onPinUser(props.myId)}
              className="w-44 shrink-0"
            >
              {!props.isVideoOff && (
                <video
                  ref={props.localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover",
                    !props.isScreenSharing && !props.isPiPActive && "transform scale-x-[-1]",
                  )}
                />
              )}
            </MeetTile>
          )}
          {thumbnailPeers.map((p) => (
            <PeerMeetTile
              key={p.socketId}
              peer={p}
              isActiveSpeaker={props.activeSpeakers.has(p.userData.id)}
              isHandRaised={props.handRaisedUsers.has(p.userData.id)}
              isPinned={props.pinnedUserId === p.userData.id}
              onPin={() => props.onPinUser(p.userData.id)}
              isReconnecting={props.reconnectingPeers.has(p.socketId)}
              className="w-44 shrink-0"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ─── Meet Tile (Pixel-perfect Google Meet) ───
// ═══════════════════════════════════════════════════

interface MeetTileProps {
  isLocal?: boolean;
  name: string;
  image: string;
  userId: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isActiveSpeaker: boolean;
  isHandRaised: boolean;
  isPinned: boolean;
  connectionQuality?: "excellent" | "good" | "fair" | "poor" | "unknown";
  className?: string;
  onPin: () => void;
  children?: React.ReactNode;
}

import { useDominantColor } from "@/hooks/useDominantColor";

function MeetTile({
  isLocal,
  name,
  image,
  userId,
  isMuted,
  isVideoOff,
  isActiveSpeaker,
  isHandRaised,
  isPinned,
  connectionQuality,
  className,
  onPin,
  children,
}: MeetTileProps) {
  const fallbackGradient = useMemo(() => getUserGradient(name), [name]);
  const avatarColor = useMemo(() => getUserColor(name), [name]);
  const dominantGradient = useDominantColor(isVideoOff ? image : null); // Only compute if camera is off

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden group flex-1 w-full h-full",
        "border-2 transition-all duration-200 z-0",
        isActiveSpeaker ? "border-[#8ab4f8]" : "border-transparent",
        className,
      )}
      style={
        isVideoOff
          ? { background: dominantGradient || fallbackGradient }
          : { background: "#3c4043" }
      }
      onDoubleClick={onPin}
    >
      {/* Animated Speaking Glow */}
      {isActiveSpeaker && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none z-20"
          initial={{ boxShadow: "inset 0 0 0 0px rgba(138, 180, 248, 0)" }}
          animate={{
            boxShadow: [
              "inset 0 0 0 0px rgba(138, 180, 248, 0.2)",
              "inset 0 0 12px 2px rgba(138, 180, 248, 0.6)",
              "inset 0 0 0 0px rgba(138, 180, 248, 0.2)",
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {isVideoOff ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Avatar Speaking Glow (Google Meet inner ring style) */}
            {isActiveSpeaker && (
              <motion.div
                className="absolute inset-0 rounded-full bg-[#8ab4f8]/30 z-0"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 1.4, 1.6], opacity: [0.6, 0.2, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            )}
            <Avatar className="h-[72px] w-[72px] relative z-10 shadow-lg">
              <AvatarImage src={image} />
              <AvatarFallback
                className="text-3xl font-medium text-white"
                style={{ backgroundColor: avatarColor }}
              >
                {name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      ) : (
        children
      )}

      {/* Name — bottom-left, Google Meet: white text directly, minimal bg */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-3 py-2">
        <span className="text-[13px] text-white font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate block">
          {isLocal ? `${name} (You)` : name}
        </span>
      </div>

      {/* Muted mic — top-right corner, Google Meet style */}
      {isMuted && (
        <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-[#202124]/70 flex items-center justify-center">
          <MicOff className="w-3.5 h-3.5 text-[#ea4335]" />
        </div>
      )}

      {/* Hand raised — top-left */}
      <AnimatePresence>
        {isHandRaised && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute top-2 left-2 z-10 bg-[#fdd663] rounded-full p-1.5 shadow-lg"
          >
            <Hand className="w-4 h-4 text-[#202124]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pin on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPin();
        }}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#202124]/60 rounded-full p-1.5 hover:bg-[#202124]/80"
        title={isPinned ? "Unpin" : "Pin"}
        style={isMuted ? { right: "40px" } : {}}
      >
        {isPinned ? (
          <PinOff className="w-3.5 h-3.5 text-white" />
        ) : (
          <Pin className="w-3.5 h-3.5 text-white" />
        )}
      </button>

      {/* Connection quality */}
      {!isLocal && connectionQuality && connectionQuality !== "unknown" && (
        <div className="absolute bottom-2 right-2 z-10">
          <ConnectionQualityIndicator quality={connectionQuality} />
        </div>
      )}
    </div>
  );
}

// ─── Peer Meet Tile ───
function PeerMeetTile({
  peer,
  isActiveSpeaker,
  isHandRaised,
  isPinned,
  onPin,
  className,
  isReconnecting = false,
}: {
  peer: any;
  isActiveSpeaker: boolean;
  isHandRaised: boolean;
  isPinned: boolean;
  onPin: () => void;
  className?: string;
  isReconnecting?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = peer.stream
    ?.getVideoTracks()
    .some((t: MediaStreamTrack) => t.enabled);
  useEffect(() => {
    if (videoRef.current && peer.stream)
      videoRef.current.srcObject = peer.stream;
  }, [peer.stream]);

  return (
    <MeetTile
      name={peer.userData.name}
      image={peer.userData.image}
      userId={peer.userData.id}
      isVideoOff={!hasVideo}
      isActiveSpeaker={isActiveSpeaker}
      isHandRaised={isHandRaised}
      isPinned={isPinned}
      connectionQuality={peer.connectionQuality}
      onPin={onPin}
      className={cn("w-full h-full", className)}
    >
      {peer.stream && hasVideo && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      )}
      {peer.stream && !hasVideo && (
        <video ref={videoRef} autoPlay playsInline className="hidden" />
      )}
      {isReconnecting && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
          <div className="w-8 h-8 border-2 border-[#8ab4f8] border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-xs text-[#e8eaed] font-medium">Reconnecting…</span>
        </div>
      )}
    </MeetTile>
  );
}

// ─── Floating Reactions ───
function FloatingReactions({ reactions }: { reactions: Reaction[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => {
          const x = 10 + Math.random() * 80;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, y: "100vh", x: `${x}%`, scale: 0.5 }}
              animate={{ opacity: 1, y: "-10vh", scale: 1.2 }}
              exit={{ opacity: 0, scale: 0.3 }}
              transition={{ duration: 2.8, ease: "easeOut" }}
              className="absolute bottom-0 flex flex-col items-center"
            >
              <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
              <span className="text-[10px] text-white/80 bg-[#303134]/80 rounded-full px-2 py-0.5 mt-0.5 font-medium">
                {r.userName}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
