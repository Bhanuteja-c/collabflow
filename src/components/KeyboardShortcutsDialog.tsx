"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { formatShortcut } from "@/hooks/useKeyboardShortcuts";
import { Button } from "@/components/ui/button";

interface ShortcutInfo {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    category?: string;
}

const SHORTCUTS: ShortcutInfo[] = [
    // Navigation
    { key: "k", ctrl: true, description: "Open search / command palette", category: "Navigation" },
    { key: "1", ctrl: true, description: "Go to Dashboard", category: "Navigation" },
    { key: "2", ctrl: true, description: "Go to Documents", category: "Navigation" },
    { key: "3", ctrl: true, description: "Go to Kanban", category: "Navigation" },
    { key: "4", ctrl: true, description: "Go to Chat", category: "Navigation" },
    { key: "5", ctrl: true, description: "Go to Video", category: "Navigation" },

    // Actions
    { key: "n", alt: true, description: "Create new document", category: "Actions" },
    { key: "/", description: "Focus search", category: "Actions" },
    { key: "?", shift: true, description: "Show keyboard shortcuts", category: "Actions" },
];

export function KeyboardShortcutsDialog() {
    const [isOpen, setIsOpen] = useState(false);

    // Listen for Shift+? to open
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "?" && e.shiftKey) {
                const target = e.target as HTMLElement;
                if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);

    // Group by category
    const categories = SHORTCUTS.reduce<Record<string, ShortcutInfo[]>>((acc, s) => {
        const cat = s.category || "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(s);
        return acc;
    }, {});

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={() => setIsOpen(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
                    >
                        <div className="bg-card border rounded-xl shadow-lg overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b">
                                <div className="flex items-center gap-2">
                                    <Keyboard className="w-4 h-4 text-muted-foreground" />
                                    <h2 className="font-semibold text-sm">Keyboard Shortcuts</h2>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="p-5 max-h-[400px] overflow-y-auto space-y-5">
                                {Object.entries(categories).map(([category, items]) => (
                                    <div key={category}>
                                        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                            {category}
                                        </h3>
                                        <div className="space-y-1">
                                            {items.map((shortcut, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                                                >
                                                    <span className="text-sm">{shortcut.description}</span>
                                                    <kbd className="inline-flex items-center gap-0.5 rounded border bg-background px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                                                        {formatShortcut(shortcut)}
                                                    </kbd>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="px-5 py-3 border-t text-xs text-muted-foreground text-center">
                                Press <kbd className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] mx-1">?</kbd> to toggle this dialog
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
