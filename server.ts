// server.ts - Custom server with Socket.io for real-time collaboration
// This is the slim entry point — all socket logic lives in src/socket/
import "dotenv/config"; // Load .env BEFORE any other imports (Prisma, Next.js, etc.)
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { registerSocketHandlers } from "./src/socket/index";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store the io instance globally for API routes to use
declare global {
    var io: SocketIOServer | undefined;
}

app.prepare().then(async () => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.io with production-optimized settings
    let adapter;
    if (process.env.REDIS_URL) {
        console.log("[Server] Attempting Redis Adapter connection...");
        try {
            const tlsOpts = process.env.REDIS_URL?.startsWith("rediss://")
                ? { tls: { rejectUnauthorized: false } }
                : {};

            const redisOpts = {
                ...tlsOpts,
                connectTimeout: 10000,
                retryStrategy(times: number) {
                    if (times > 3) {
                        console.warn(`[Server] Redis adapter: giving up after ${times} attempts.`);
                        return null;
                    }
                    return Math.min(times * 1000, 5000);
                },
            };

            const pubClient = new Redis(process.env.REDIS_URL, redisOpts);
            const subClient = pubClient.duplicate();

            let pubError = false;
            let subError = false;

            pubClient.on("error", (err) => {
                if (!pubError) {
                    console.warn("[Server] Redis Pub Client Error:", err.message);
                    pubError = true;
                }
            });
            subClient.on("error", (err) => {
                if (!subError) {
                    console.warn("[Server] Redis Sub Client Error:", err.message);
                    subError = true;
                }
            });

            // Wait up to 15s for a connection, fall back to in-memory if it fails
            const connected = await Promise.race([
                new Promise<boolean>((resolve) => {
                    pubClient.on("connect", () => resolve(true));
                    pubClient.on("end", () => resolve(false));
                }),
                new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 15000)),
            ]);

            if (connected) {
                adapter = createAdapter(pubClient, subClient);
                console.log("[Server] Redis Adapter connected ✓");
            } else {
                console.warn("[Server] Redis unreachable — falling back to in-memory adapter.");
                console.warn("[Server] Real-time features will work, but only within this server instance.");
                // Close the failed connections to stop error spam
                pubClient.disconnect();
                subClient.disconnect();
            }
        } catch (e) {
            console.error("[Server] Failed to initialize Redis adapter:", e);
            console.warn("[Server] Falling back to in-memory adapter.");
        }
    } else {
        console.log("[Server] No REDIS_URL found, using default in-memory adapter.");
    }

    const io = new SocketIOServer(httpServer, {
        path: "/api/socketio",
        adapter,
        cors: {
            origin: process.env.NEXTAUTH_URL || "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ["websocket", "polling"],
        allowUpgrades: true,
        perMessageDeflate: false,
        httpCompression: false,
        maxHttpBufferSize: 1e6,
    });

    // Store globally for API routes
    global.io = io;

    // Register all socket handlers (auth middleware + feature handlers + disconnect)
    registerSocketHandlers(io);

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Socket.io server running on /api/socketio`);
    });
});
