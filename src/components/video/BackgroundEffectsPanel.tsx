// src/components/video/BackgroundEffectsPanel.tsx
// Enhanced: loading skeleton, selected checkmark, styled header, upload custom
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ban, Sparkles, Image as ImageIcon, Check, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BackgroundMode } from "@/hooks/useVirtualBackground";

const BACKGROUND_IMAGES = [
  { id: "blur", label: "Blur", url: null },
  { id: "office", label: "Office", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=640&q=80" },
  { id: "beach", label: "Beach", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=640&q=80" },
  { id: "mountain", label: "Mountain", url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=640&q=80" },
  { id: "cityscape", label: "City", url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=640&q=80" },
  { id: "nature", label: "Nature", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=640&q=80" },
  { id: "space", label: "Space", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=640&q=80" },
  { id: "library", label: "Library", url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=640&q=80" },
];

interface BackgroundEffectsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  backgroundMode: BackgroundMode;
  onToggleBlur: () => void;
  onSetBackgroundImage: (url: string | null) => void;
}

export function BackgroundEffectsPanel({
  isOpen,
  onClose,
  backgroundMode,
  onToggleBlur,
  onSetBackgroundImage,
}: BackgroundEffectsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    backgroundMode === "blur" ? "blur" : backgroundMode === "image" ? "custom" : null
  );
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleSelect = (id: string, url: string | null) => {
    if (id === "blur") {
      if (backgroundMode === "blur") {
        setSelectedId(null);
        onToggleBlur();
      } else {
        setSelectedId("blur");
        onSetBackgroundImage(null);
        onToggleBlur();
      }
    } else if (url) {
      setSelectedId(id);
      onSetBackgroundImage(url);
    }
  };

  const handleNone = () => {
    setSelectedId(null);
    if (backgroundMode === "blur") onToggleBlur();
    else onSetBackgroundImage(null);
  };

  const handleCustomUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setSelectedId("custom-upload");
        onSetBackgroundImage(url);
      }
    };
    input.click();
  };

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
            className="bg-[#2d2e30] rounded-2xl shadow-2xl border border-[#5f6368]/30 w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#5f6368]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#8ab4f8]/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#8ab4f8]" />
                </div>
                <h2 className="text-base font-medium text-[#e8eaed]">Backgrounds & effects</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] hover:text-[#e8eaed] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-[11px] text-[#5f6368] mb-4">
                Visual effects are processed locally on your device.
              </p>

              <div className="grid grid-cols-4 gap-3">
                {/* None */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNone}
                  className={cn(
                    "aspect-video rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all relative",
                    !selectedId && backgroundMode === "none"
                      ? "border-[#8ab4f8] bg-[#8ab4f8]/10"
                      : "border-[#5f6368]/20 bg-[#3c4043] hover:border-[#5f6368]/50",
                  )}
                >
                  <Ban className="w-5 h-5 text-[#9aa0a6]" />
                  <span className="text-[10px] text-[#9aa0a6]">None</span>
                  {!selectedId && backgroundMode === "none" && <SelectedBadge />}
                </motion.button>

                {/* Blur */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelect("blur", null)}
                  className={cn(
                    "aspect-video rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all relative",
                    selectedId === "blur" && backgroundMode === "blur"
                      ? "border-[#8ab4f8] bg-[#8ab4f8]/10"
                      : "border-[#5f6368]/20 bg-[#3c4043] hover:border-[#5f6368]/50",
                  )}
                >
                  <Sparkles className="w-5 h-5 text-[#8ab4f8]" />
                  <span className="text-[10px] text-[#9aa0a6]">Blur</span>
                  {selectedId === "blur" && backgroundMode === "blur" && <SelectedBadge />}
                </motion.button>

                {/* Background Images */}
                {BACKGROUND_IMAGES.filter(b => b.url).map((bg, i) => (
                  <motion.button
                    key={bg.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleSelect(bg.id, bg.url!)}
                    className={cn(
                      "aspect-video rounded-xl border-2 overflow-hidden relative transition-all",
                      selectedId === bg.id
                        ? "border-[#8ab4f8] ring-2 ring-[#8ab4f8]/20"
                        : "border-[#5f6368]/20 hover:border-[#5f6368]/50",
                    )}
                  >
                    {/* Loading skeleton */}
                    {!loadedImages.has(bg.id) && (
                      <div className="absolute inset-0 bg-[#3c4043] animate-pulse" />
                    )}
                    <img
                      src={bg.url!}
                      alt={bg.label}
                      className={cn(
                        "w-full h-full object-cover transition-opacity duration-300",
                        loadedImages.has(bg.id) ? "opacity-100" : "opacity-0"
                      )}
                      loading="lazy"
                      onLoad={() => setLoadedImages(prev => new Set([...prev, bg.id]))}
                    />
                    {/* Label overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-1.5 py-1">
                      <span className="text-[9px] text-white font-medium">{bg.label}</span>
                    </div>
                    {/* Selected overlay */}
                    {selectedId === bg.id && <SelectedBadge />}
                  </motion.button>
                ))}

                {/* Upload custom */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCustomUpload}
                  className="aspect-video rounded-xl border-2 border-dashed border-[#5f6368]/30 flex flex-col items-center justify-center gap-1.5 transition-all hover:border-[#8ab4f8]/40 hover:bg-[#8ab4f8]/5"
                >
                  <Upload className="w-4 h-4 text-[#5f6368]" />
                  <span className="text-[9px] text-[#5f6368]">Upload</span>
                </motion.button>
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

// Checkmark badge for selected item
function SelectedBadge() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", damping: 15, stiffness: 400 }}
      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#8ab4f8] flex items-center justify-center shadow-md"
    >
      <Check className="w-3 h-3 text-[#202124]" />
    </motion.div>
  );
}
