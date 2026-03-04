// src/components/video/WaitingRoomToast.tsx
// Enhanced pop-up notification when someone knocks, with countdown, admit/reject, and pulse animation
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Clock, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Knocker } from "@/hooks/useVideoCall";

interface WaitingRoomToastProps {
  knockers: Knocker[];
  onAdmit: (socketId: string) => void;
  onReject: (socketId: string) => void;
}

// Individual knocker card with countdown
function KnockerCard({
  knocker,
  onAdmit,
  onReject,
}: {
  knocker: Knocker;
  onAdmit: () => void;
  onReject: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const joinedAt = useState(() => Date.now())[0];

  // Count up timer — shows how long they've been waiting
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - joinedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [joinedAt]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 120, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 120, scale: 0.85, transition: { duration: 0.2 } }}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      className="bg-[#303134]/95 backdrop-blur-xl border border-[#5f6368]/30 rounded-2xl p-4 shadow-2xl"
    >
      {/* Pulsing top accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#8ab4f8] via-[#1a73e8] to-[#8ab4f8]"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Avatar with pulse ring */}
        <div className="relative shrink-0">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[#8ab4f8]/50"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <img
            src={knocker.userImage || "/avatar-placeholder.png"}
            alt={knocker.userName}
            className="w-11 h-11 rounded-full object-cover border-2 border-[#5f6368]/40"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#e8eaed] truncate">{knocker.userName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <UserPlus className="w-3 h-3 text-[#8ab4f8]" />
            <span className="text-xs text-[#9aa0a6]">wants to join</span>
            <span className="text-[10px] text-[#5f6368] ml-auto flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(elapsed)}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onReject}
          className="flex-1 h-9 rounded-full bg-[#3c4043] hover:bg-[#ea4335] flex items-center justify-center gap-1.5 text-[#e8eaed] text-xs font-medium transition-all hover:shadow-lg hover:shadow-[#ea4335]/20"
        >
          <X className="w-3.5 h-3.5" />
          Deny
        </button>
        <button
          onClick={onAdmit}
          className="flex-1 h-9 rounded-full bg-[#1a73e8] hover:bg-[#1765cc] flex items-center justify-center gap-1.5 text-white text-xs font-medium transition-all hover:shadow-lg hover:shadow-[#1a73e8]/30"
        >
          <Check className="w-3.5 h-3.5" />
          Admit
        </button>
      </div>
    </motion.div>
  );
}

export function WaitingRoomToast({ knockers, onAdmit, onReject }: WaitingRoomToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {knockers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center mb-1"
          >
            <span className="text-[10px] text-[#9aa0a6] bg-[#303134]/80 backdrop-blur rounded-full px-3 py-1 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fbbc04] animate-pulse" />
              {knockers.length} waiting
            </span>
          </motion.div>
        )}
        {knockers.map((k) => (
          <div key={k.socketId} className="pointer-events-auto">
            <KnockerCard
              knocker={k}
              onAdmit={() => onAdmit(k.socketId)}
              onReject={() => onReject(k.socketId)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
