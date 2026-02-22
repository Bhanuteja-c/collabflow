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

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.io with production-optimized settings
    let adapter;
    if (process.env.REDIS_URL) {
        console.log("Initializing Redis Adapter...");
        try {
            const tlsOpts = process.env.REDIS_URL?.startsWith("rediss://")
                ? { tls: { rejectUnauthorized: false } }
                : {};
            const pubClient = new Redis(process.env.REDIS_URL, tlsOpts);
            const subClient = pubClient.duplicate();
            
            pubClient.on("error", (err) => {
                console.error("Redis Pub Client Error:", err.message);
            });
            subClient.on("error", (err) => {
               console.error("Redis Sub Client Error:", err.message);
            });

            adapter = createAdapter(pubClient, subClient);
        } catch (e) {
            console.error("Failed to initialize Redis adapter:", e);
        }
    } else {
        console.log("No REDIS_URL found, using default in-memory adapter.");
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
