// src/lib/pusher.ts
// Pusher/Soketi configuration for real-time chat
// Works with both Pusher cloud and self-hosted Soketi
import Pusher from "pusher";
import PusherClient from "pusher-js";

// Determine if using Soketi (self-hosted) or Pusher Cloud
const useSoketi = process.env.PUSHER_HOST && process.env.PUSHER_HOST !== "";

// Server-side Pusher/Soketi instance
export const pusherServer = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    // Soketi config
    ...(useSoketi ? {
        host: process.env.PUSHER_HOST!,
        port: process.env.PUSHER_PORT!,
        useTLS: process.env.PUSHER_SCHEME === "https",
    } : {
        // Pusher Cloud config
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        useTLS: true,
    }),
});

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = () => {
    if (!pusherClientInstance) {
        const useSoketiClient = process.env.NEXT_PUBLIC_PUSHER_HOST && process.env.NEXT_PUBLIC_PUSHER_HOST !== "";

        pusherClientInstance = new PusherClient(
            process.env.NEXT_PUBLIC_PUSHER_KEY!,
            useSoketiClient ? {
                // Soketi config
                cluster: "default", // Required by types but not used by Soketi
                wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST!,
                wsPort: parseInt(process.env.NEXT_PUBLIC_PUSHER_PORT || "6001"),
                wssPort: parseInt(process.env.NEXT_PUBLIC_PUSHER_PORT || "6001"),
                forceTLS: process.env.NEXT_PUBLIC_PUSHER_SCHEME === "https",
                disableStats: true,
                enabledTransports: ["ws", "wss"],
                authEndpoint: "/api/pusher/auth",
            } : {
                // Pusher Cloud config
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
                authEndpoint: "/api/pusher/auth",
            }
        );
    }
    return pusherClientInstance;
};
