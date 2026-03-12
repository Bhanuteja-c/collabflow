// src/components/whiteboard/CollaborativeWhiteboard.tsx
// Tldraw-based collaborative whiteboard with auto-save
"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw, Editor, getSnapshot, loadSnapshot } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";

interface CollaborativeWhiteboardProps {
    whiteboardId: string;
    title: string;
    onTitleChange?: (title: string) => void;
}

export default function CollaborativeWhiteboard({
    whiteboardId,
    title,
    onTitleChange,
}: CollaborativeWhiteboardProps) {
    const editorRef = useRef<Editor | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-save snapshot to server
    const saveToServer = useCallback(async () => {
        const editor = editorRef.current;
        if (!editor) return;

        try {
            const snapshot = getSnapshot(editor.store);
            const serialized = JSON.stringify(snapshot);
            const bytes = Array.from(new TextEncoder().encode(serialized));

            await fetch(`/api/whiteboards/${whiteboardId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ yjsState: bytes }),
            });
        } catch (e) {
            console.error("Failed to save whiteboard:", e);
        }
    }, [whiteboardId]);

    // Debounced save on changes
    const scheduleSave = useCallback(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => saveToServer(), 2000);
    }, [saveToServer]);

    // Save on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveToServer();
        };
    }, [saveToServer]);

    // Handle tldraw mount — restore snapshot if available
    const handleMount = useCallback((editor: Editor) => {
        editorRef.current = editor;

        // Fetch saved state and restore
        (async () => {
            try {
                const res = await fetch(`/api/whiteboards/${whiteboardId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.yjsState && data.yjsState.length > 0) {
                        const bytes = new Uint8Array(data.yjsState);
                        const json = new TextDecoder().decode(bytes);
                        try {
                            const snapshot = JSON.parse(json);
                            loadSnapshot(editor.store, snapshot);
                        } catch {
                            // Invalid snapshot, start fresh
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load whiteboard state:", e);
            }
        })();

        // Listen for changes and auto-save
        const unsubscribe = editor.store.listen(scheduleSave, {
            source: "user",
            scope: "document",
        });

        return () => {
            unsubscribe();
        };
    }, [whiteboardId, scheduleSave]);

    return (
        <div className="w-full h-full" style={{ position: "relative" }}>
            <Tldraw
                onMount={handleMount}
                autoFocus
            />
        </div>
    );
}
