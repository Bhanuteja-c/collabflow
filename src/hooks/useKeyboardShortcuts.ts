"use client";

import { useEffect, useCallback, useRef } from "react";

export interface Shortcut {
    key: string;           // Key to match (e.g., "k", "n", "1")
    ctrl?: boolean;        // Requires Ctrl/Cmd
    shift?: boolean;       // Requires Shift
    alt?: boolean;         // Requires Alt/Option
    action: () => void;    // Callback to execute
    description: string;   // For the help dialog
    category?: string;     // Grouping (e.g., "Navigation", "Actions")
}

/**
 * Hook to register global keyboard shortcuts.
 * Shortcuts are ignored when the user is typing in an input/textarea.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignore if user is typing in an input, textarea, or contenteditable
        const target = e.target as HTMLElement;
        if (
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable
        ) {
            // Only allow shortcuts that explicitly require Ctrl/Cmd
            const isModified = e.metaKey || e.ctrlKey;
            if (!isModified) return;
        }

        for (const shortcut of shortcutsRef.current) {
            const ctrlMatch = shortcut.ctrl
                ? e.metaKey || e.ctrlKey
                : !(e.metaKey || e.ctrlKey);
            const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
            const altMatch = shortcut.alt ? e.altKey : !e.altKey;
            const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                e.preventDefault();
                e.stopPropagation();
                shortcut.action();
                return;
            }
        }
    }, []);

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [handleKeyDown]);
}

/**
 * Format a shortcut key combination for display.
 */
export function formatShortcut(shortcut: Pick<Shortcut, "key" | "ctrl" | "shift" | "alt">): string {
    const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
    const parts: string[] = [];

    if (shortcut.ctrl) parts.push(isMac ? "⌘" : "Ctrl");
    if (shortcut.alt) parts.push(isMac ? "⌥" : "Alt");
    if (shortcut.shift) parts.push("⇧");
    parts.push(shortcut.key.toUpperCase());

    return parts.join(isMac ? "" : "+");
}
