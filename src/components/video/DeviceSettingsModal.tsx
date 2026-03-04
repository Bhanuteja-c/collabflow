// src/components/video/DeviceSettingsModal.tsx
// Enhanced: live audio meter, test speaker button, styled select with chevron, audio level indicator
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, Video, Volume2, ChevronDown, Settings, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceChange: (kind: "audioinput" | "videoinput" | "audiooutput", deviceId: string) => void;
  currentAudioInput?: string;
  currentVideoInput?: string;
  currentAudioOutput?: string;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export function DeviceSettingsModal({
  isOpen,
  onClose,
  onDeviceChange,
  currentAudioInput,
  currentVideoInput,
  currentAudioOutput,
}: DeviceSettingsModalProps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState(currentAudioInput || "");
  const [selectedCamera, setSelectedCamera] = useState(currentVideoInput || "");
  const [selectedSpeaker, setSelectedSpeaker] = useState(currentAudioOutput || "");
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const testStreamRef = useRef<MediaStream | null>(null);

  const enumerateDevices = useCallback(async () => {
    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        mediaDevices.map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind} (${d.deviceId.slice(0, 6)}…)`,
          kind: d.kind,
        })),
      );
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
    }
  }, []);

  // Start mic level monitoring
  const startAudioMonitor = useCallback(async () => {
    try {
      // Stop previous
      testStreamRef.current?.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
      });
      testStreamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(dataArray);
        let rms = 0;
        for (let i = 0; i < dataArray.length; i++) rms += dataArray[i] * dataArray[i];
        rms = Math.sqrt(rms / dataArray.length);
        // Normalize to 0-100 scale for display
        const level = Math.min(100, Math.max(0, (rms * 300)));
        setAudioLevel(level);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn("Failed to start audio monitor:", err);
    }
  }, [selectedMic]);

  const stopAudioMonitor = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    testStreamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    analyserRef.current = null;
    audioCtxRef.current = null;
    testStreamRef.current = null;
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    if (isOpen) {
      enumerateDevices();
      startAudioMonitor();
    } else {
      stopAudioMonitor();
    }
    return () => stopAudioMonitor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Restart mic monitor when mic changes
  useEffect(() => {
    if (isOpen) startAudioMonitor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMic]);

  useEffect(() => {
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
  }, [enumerateDevices]);

  const microphones = devices.filter((d) => d.kind === "audioinput");
  const cameras = devices.filter((d) => d.kind === "videoinput");
  const speakers = devices.filter((d) => d.kind === "audiooutput");

  const handleChange = (kind: "audioinput" | "videoinput" | "audiooutput", deviceId: string) => {
    if (kind === "audioinput") setSelectedMic(deviceId);
    if (kind === "videoinput") setSelectedCamera(deviceId);
    if (kind === "audiooutput") setSelectedSpeaker(deviceId);
    onDeviceChange(kind, deviceId);
  };

  const testSpeaker = useCallback(() => {
    setIsTesting(true);
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 440;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
      setIsTesting(false);
    }, 500);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="bg-[#2d2e30] rounded-2xl shadow-2xl border border-[#5f6368]/30 w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#5f6368]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#8ab4f8]/15 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-[#8ab4f8]" />
                </div>
                <h2 className="text-base font-medium text-[#e8eaed]">Device Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] hover:text-[#e8eaed] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-6">
              {/* Microphone + Audio Meter */}
              <div className="space-y-3">
                <DeviceSelect
                  icon={<Mic className="w-4 h-4 text-[#8ab4f8]" />}
                  label="Microphone"
                  devices={microphones}
                  value={selectedMic}
                  onChange={(id) => handleChange("audioinput", id)}
                />
                {/* Live audio level meter */}
                <div className="flex items-center gap-2 px-1">
                  <Mic className="w-3 h-3 text-[#5f6368]" />
                  <div className="flex-1 h-2 bg-[#3c4043] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      animate={{
                        width: `${audioLevel}%`,
                        backgroundColor: audioLevel > 70 ? "#ea4335" : audioLevel > 40 ? "#fbbc04" : "#34a853",
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <span className="text-[9px] text-[#5f6368] w-6 text-right tabular-nums">
                    {Math.round(audioLevel)}
                  </span>
                </div>
                <p className="text-[10px] text-[#5f6368] px-1">
                  {audioLevel > 5 ? "✅ Microphone is working" : "🔇 Speak to test your microphone"}
                </p>
              </div>

              {/* Camera */}
              <DeviceSelect
                icon={<Video className="w-4 h-4 text-[#8ab4f8]" />}
                label="Camera"
                devices={cameras}
                value={selectedCamera}
                onChange={(id) => handleChange("videoinput", id)}
              />

              {/* Speaker + Test */}
              <div className="space-y-3">
                <DeviceSelect
                  icon={<Volume2 className="w-4 h-4 text-[#8ab4f8]" />}
                  label="Speaker"
                  devices={speakers}
                  value={selectedSpeaker}
                  onChange={(id) => handleChange("audiooutput", id)}
                />
                <button
                  onClick={testSpeaker}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 text-xs text-[#8ab4f8] hover:text-[#aecbfa] transition-colors px-1 disabled:opacity-50"
                >
                  <Play className={cn("w-3 h-3", isTesting && "animate-pulse")} />
                  {isTesting ? "Playing..." : "Test speaker"}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#5f6368]/20 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-[#8ab4f8] text-[#202124] text-sm font-semibold hover:bg-[#aecbfa] transition-all shadow-sm hover:shadow-md hover:shadow-[#8ab4f8]/20"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Device Select Row ───
function DeviceSelect({
  icon,
  label,
  devices,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  devices: DeviceInfo[];
  value: string;
  onChange: (deviceId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-[#9aa0a6] uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-[#5f6368] ml-auto">{devices.length} available</span>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-[#3c4043] text-[#e8eaed] text-sm rounded-xl px-4 py-3 pr-10 border border-[#5f6368]/20 hover:border-[#8ab4f8]/40 focus:border-[#8ab4f8] focus:ring-2 focus:ring-[#8ab4f8]/20 outline-none transition-all cursor-pointer"
        >
          {devices.length === 0 ? (
            <option value="">No devices found</option>
          ) : (
            devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))
          )}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9aa0a6] pointer-events-none" />
      </div>
    </div>
  );
}
