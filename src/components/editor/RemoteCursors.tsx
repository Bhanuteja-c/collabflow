"use client";

import { useEffect, useState, useRef } from "react";
import { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";

interface RemoteUser {
    socketId: string;
    user: {
        id: string;
        name: string;
        color: string;
        image?: string;
    };
    cursor?: { from: number; to: number };
}

interface RemoteCursorsProps {
    editor: Editor | null;
    remoteUsers: RemoteUser[];
}

interface CursorPosition {
    socketId: string;
    name: string;
    color: string;
    top: number;
    left: number;
    visible: boolean;
    active?: boolean;
}

export function RemoteCursors({ editor, remoteUsers }: RemoteCursorsProps) {
    const [cursors, setCursors] = useState<CursorPosition[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const cursorTimers = useRef<{ [socketId: string]: NodeJS.Timeout }>({});

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            Object.values(cursorTimers.current).forEach(clearTimeout);
        };
    }, []);

    useEffect(() => {
        if (!editor) return;

        const updateCursors = () => {
            const newCursors: CursorPosition[] = [];

            remoteUsers.forEach((remoteUser) => {
                if (!remoteUser.cursor) return;

                try {
                    // Get coordinates for the cursor position
                    const coords = editor.view.coordsAtPos(remoteUser.cursor.from);

                    // Get editor container bounds
                    const editorRect = editor.view.dom.getBoundingClientRect();

                    // Calculate relative position
                    const top = coords.top - editorRect.top;
                    const left = coords.left - editorRect.left;

                    // Only show if within reasonable bounds
                    const visible = top >= 0 && top <= editorRect.height &&
                        left >= 0 && left <= editorRect.width;

                    newCursors.push({
                        socketId: remoteUser.socketId,
                        name: remoteUser.user.name,
                        color: remoteUser.user.color,
                        top,
                        left,
                        visible,
                        active: true, // Activity flag
                    });

                    // Reset fade-out timer for this cursor
                    if (cursorTimers.current[remoteUser.socketId]) {
                        clearTimeout(cursorTimers.current[remoteUser.socketId]);
                    }
                    cursorTimers.current[remoteUser.socketId] = setTimeout(() => {
                        setCursors(currentCursors => 
                            currentCursors.map(c => 
                                c.socketId === remoteUser.socketId ? { ...c, active: false } : c
                            )
                        );
                    }, 3000);
                } catch (e) {
                    // Position might be out of range, ignore
                }
            });

            setCursors(newCursors);
        };

        // Update cursors when remote users change
        updateCursors();

        // Also update on editor transaction (scroll, resize, etc.)
        const handleUpdate = () => {
            requestAnimationFrame(updateCursors);
        };

        editor.on("transaction", handleUpdate);

        // Update on scroll
        const editorElement = editor.view.dom;
        editorElement.addEventListener("scroll", handleUpdate, { passive: true });

        // Update on window resize
        window.addEventListener("resize", handleUpdate, { passive: true });

        return () => {
            editor.off("transaction", handleUpdate);
            editorElement.removeEventListener("scroll", handleUpdate);
            window.removeEventListener("resize", handleUpdate);
        };
    }, [editor, remoteUsers]);

    if (!editor) return null;

    return (
        <div
            ref={containerRef}
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ zIndex: 50 }}
        >
            <AnimatePresence>
                {cursors.map((cursor) => cursor.visible && (
                    <motion.div
                        key={cursor.socketId}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute"
                        style={{
                            top: cursor.top,
                            left: cursor.left,
                            transform: "translateY(-2px)",
                        }}
                    >
                        {/* Cursor line */}
                        <div
                            className="w-0.5 h-5 rounded-full"
                            style={{ backgroundColor: cursor.color }}
                        />

                        {/* Name label - Fades out on inactivity */}
                        <AnimatePresence>
                            {cursor.active && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute -top-5 left-0 whitespace-nowrap"
                                >
                                    <span
                                        className="text-[10px] font-medium text-white px-1.5 py-0.5 rounded shadow-sm"
                                        style={{ backgroundColor: cursor.color }}
                                    >
                                        {cursor.name}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
