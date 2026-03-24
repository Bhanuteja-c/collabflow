// src/components/whiteboard/CollaborativeWhiteboard.tsx
// Tldraw-based collaborative whiteboard with WebSockets via SocketProvider
"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw, Editor, getSnapshot, loadSnapshot, TLStoreEventInfo } from "@tldraw/tldraw";
import { useSharedSocket } from "@/components/providers/SocketProvider";
import "@tldraw/tldraw/tldraw.css";

interface CollaborativeWhiteboardProps {
    whiteboardId: string;
    title: string;
    onTitleChange?: (title: string) => void;
}

export default function CollaborativeWhiteboard({ whiteboardId }: CollaborativeWhiteboardProps) {
    const editorRef = useRef<Editor | null>(null);
    const { socket, connected } = useSharedSocket();
    const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Save fallback hook to guarantee persistence upon unmounting or network death
    const saveToServer = useCallback(async () => {
        const editor = editorRef.current;
        if (!editor) return;
        try {
            const snapshot = getSnapshot(editor.store);
            const bytes = Array.from(new TextEncoder().encode(JSON.stringify(snapshot)));
            fetch(`/api/whiteboards/${whiteboardId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "keepalive": "true" },
                body: JSON.stringify({ yjsState: bytes }),
            }).catch(console.error);
        } catch (e) {
            console.error("Failed final fallback save:", e);
        }
    }, [whiteboardId]);

    const handleMount = useCallback((editor: Editor) => {
        editorRef.current = editor;

        // 1. Initial Data Hydration
        (async () => {
            try {
                const res = await fetch(`/api/whiteboards/${whiteboardId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.yjsState && data.yjsState.length > 0) {
                        const json = new TextDecoder().decode(new Uint8Array(data.yjsState));
                        try {
                            loadSnapshot(editor.store, JSON.parse(json));
                        } catch {}
                    }
                }
            } catch (e) {
                console.error("Hydration failed:", e);
            }
        })();

        // Wait to attach socket events until we have a connected socket
        if (!socket || !connected) return;

        socket.emit("whiteboard:join", { whiteboardId });

        // 2. Apply remote deltas immediately inside `mergeRemoteChanges` to avoid looping
        const handleWhiteboardUpdate = (data: { update: TLStoreEventInfo }) => {
            editor.store.mergeRemoteChanges(() => {
                const { added, updated, removed } = data.update.changes;
                if (added) editor.store.put(Object.values(added));
                if (updated) editor.store.put(Object.values(updated).map(u => u[1]));
                if (removed) editor.store.remove(Object.values(removed).map(r => r.id));
            });
        };

        // 3. Handle incoming cursor/presence 
        const handleWhiteboardAwareness = (data: { socketId: string; awareness: any }) => {
             editor.store.mergeRemoteChanges(() => {
                 if (data.awareness) editor.store.put([data.awareness]);
             });
        };

        socket.on("whiteboard:update", handleWhiteboardUpdate);
        socket.on("whiteboard:awareness", handleWhiteboardAwareness);

        // 4. Broadcast Local Actions
        const unsubscribe = editor.store.listen((update: TLStoreEventInfo) => {
            if (update.source === "user") {
                const fullSnapshot = getSnapshot(editor.store);
                socket.emit("whiteboard:update", { whiteboardId, update, fullSnapshot });
            }
        }, { source: "user", scope: "document" });

        // 5. Broadcast Cursor Location (Presence tracking) repeatedly for smooth visual syncing
        // Increased interval from 50ms to 100ms to reduce network congestion as requested
        cursorIntervalRef.current = setInterval(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const presenceRecords = editor.store.query.records("instance_presence" as any).get();
            if (presenceRecords && presenceRecords.length > 0) {
                 socket.emit("whiteboard:awareness", { whiteboardId, awareness: presenceRecords[0] });
            }
        }, 100);

        return () => {
            unsubscribe();
            if (cursorIntervalRef.current) clearInterval(cursorIntervalRef.current);
            socket.off("whiteboard:update", handleWhiteboardUpdate);
            socket.off("whiteboard:awareness", handleWhiteboardAwareness);
            socket.emit("whiteboard:leave", { whiteboardId });
            saveToServer();
        };
    }, [whiteboardId, socket, connected, saveToServer]);

    return (
        <div className="w-full h-full" style={{ position: "relative" }}>
            <Tldraw onMount={handleMount} autoFocus />
        </div>
    );
}

