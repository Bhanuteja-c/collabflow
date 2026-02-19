// src/components/providers/SocketProvider.tsx
// Provides a SINGLE shared Socket.IO connection to all hooks via React context.
// Replaces 4 independent socket connections (chat, kanban, document, workspace)
// with exactly ONE connection per client tab.
"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextValue {
    socket: Socket | null;
    connected: boolean;
    connectionState: "connecting" | "connected" | "disconnected" | "reconnecting";
}

const SocketContext = createContext<SocketContextValue>({
    socket: null,
    connected: false,
    connectionState: "connecting",
});

export function useSharedSocket(): SocketContextValue {
    return useContext(SocketContext);
}

interface SocketProviderProps {
    children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
    const [connected, setConnected] = useState(false);
    const [connectionState, setConnectionState] = useState<SocketContextValue["connectionState"]>("connecting");
    const socketRef = useRef<Socket | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        // Create exactly ONE socket connection for the entire application
        const s = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
            // Reconnection settings for production stability
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            randomizationFactor: 0.5,
            timeout: 20000,
            // Socket.IO will send cookies automatically (including NextAuth session token)
            // The server-side auth middleware reads and verifies this JWT.
            withCredentials: true,
            forceNew: false,
            multiplex: true,
        });

        socketRef.current = s;
        setSocket(s);

        s.on("connect", () => {
            console.log("[SocketProvider] Connected:", s.id);
            setConnected(true);
            setConnectionState("connected");
        });

        s.on("disconnect", (reason) => {
            console.log("[SocketProvider] Disconnected:", reason);
            setConnected(false);
            setConnectionState("disconnected");
        });

        s.on("reconnect_attempt", (attemptNumber) => {
            console.log("[SocketProvider] Reconnect attempt:", attemptNumber);
            setConnectionState("reconnecting");
        });

        s.on("reconnect", () => {
            console.log("[SocketProvider] Reconnected");
            setConnected(true);
            setConnectionState("connected");
        });

        s.on("connect_error", (err) => {
            console.error("[SocketProvider] Connection error:", err.message);
            setConnectionState("disconnected");
        });

        // Handle server-side errors (e.g. auth failure, permission denied)
        s.on("error", (data: { message: string; code?: string }) => {
            console.error("[SocketProvider] Server error:", data.message, data.code);
        });

        return () => {
            s.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, connected, connectionState }}>
            {children}
        </SocketContext.Provider>
    );
}
