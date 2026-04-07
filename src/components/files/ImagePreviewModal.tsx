// src/components/files/ImagePreviewModal.tsx
// Full-screen lightbox overlay for image files
"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils";
import type { FileItem } from "@/hooks/useFiles";

interface ImagePreviewModalProps {
    file: FileItem | null;
    isOpen: boolean;
    onClose: () => void;
    onPrevious?: () => void;
    onNext?: () => void;
    hasPrevious?: boolean;
    hasNext?: boolean;
}

export function ImagePreviewModal({
    file,
    isOpen,
    onClose,
    onPrevious,
    onNext,
    hasPrevious = false,
    hasNext = false,
}: ImagePreviewModalProps) {
    // ESC key handler
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft" && hasPrevious) onPrevious?.();
            if (e.key === "ArrowRight" && hasNext) onNext?.();
        },
        [onClose, onPrevious, onNext, hasPrevious, hasNext]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, handleKeyDown]);

    const handleDownload = () => {
        if (!file) return;
        const link = document.createElement("a");
        link.href = file.url;
        link.download = file.originalName;
        link.target = "_blank";
        link.click();
    };

    return (
        <AnimatePresence>
            {isOpen && file && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
                    onClick={onClose}
                >
                    {/* Top bar */}
                    <div
                        className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-white/80 text-sm truncate max-w-[50%]">
                            <p className="font-medium">{file.originalName}</p>
                            <p className="text-xs text-white/50">{formatFileSize(file.size)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/70 hover:text-white hover:bg-white/10"
                                onClick={() => window.open(file.url, "_blank")}
                            >
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/70 hover:text-white hover:bg-white/10"
                                onClick={handleDownload}
                            >
                                <Download className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/70 hover:text-white hover:bg-white/10"
                                onClick={onClose}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Image */}
                    <motion.img
                        key={file.id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        src={file.url}
                        alt={file.originalName}
                        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Navigation arrows */}
                    {hasPrevious && (
                        <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onPrevious?.();
                            }}
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    {hasNext && (
                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNext?.();
                            }}
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
