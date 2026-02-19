// src/socket/middleware.ts
// Socket.IO authentication middleware — verifies NextAuth JWT on connection
import { decode } from "next-auth/jwt";
import type { Socket } from "socket.io";

// ExtendedError was previously imported from "socket.io/dist/namespace",
// but that internal path no longer exists in socket.io v4.8+.
// The type is simply an Error with an optional `data` property.
type ExtendedError = Error & { data?: any };
import type { SocketData } from "./types";

/**
 * Parses a cookie string and returns the value for the given name.
 */
function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
    if (!cookieHeader) return undefined;
    const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.substring(name.length + 1)) : undefined;
}

/**
 * Socket.IO middleware that authenticates connections using NextAuth JWT.
 *
 * How it works:
 * 1. On every new WebSocket connection, this middleware runs BEFORE any event handler.
 * 2. It reads the NextAuth session token from the browser cookie.
 *    - NextAuth v5 uses `authjs.session-token` (production) or `authjs.session-token` (dev).
 *    - For secure (HTTPS) environments, the cookie is prefixed with `__Secure-`.
 * 3. The token is decoded using NextAuth's `decode()` with the shared AUTH_SECRET.
 * 4. If valid, `socket.data.userId` is set to the verified user ID.
 * 5. If invalid or missing, the connection is rejected with an error.
 *
 * After this middleware, every handler can trust `socket.data.userId` — it came
 * from a verified JWT, NOT from client-sent event data.
 */
export async function socketAuthMiddleware(
    socket: Socket<any, any, any, SocketData>,
    next: (err?: ExtendedError) => void
) {
    try {
        const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
        if (!secret) {
            console.error("[Socket.io Auth] AUTH_SECRET is not configured");
            return next(new Error("Server misconfiguration"));
        }

        const cookies = socket.handshake.headers.cookie;

        // Try all possible NextAuth v5 cookie names
        const tokenCookieNames = [
            "__Secure-authjs.session-token", // production HTTPS
            "authjs.session-token",          // development HTTP
            "__Secure-next-auth.session-token", // legacy NextAuth
            "next-auth.session-token",          // legacy NextAuth dev
        ];

        let rawToken: string | undefined;
        let matchedCookieName: string | undefined;
        for (const name of tokenCookieNames) {
            rawToken = parseCookie(cookies, name);
            if (rawToken) {
                matchedCookieName = name;
                break;
            }
        }

        // Also allow token via handshake auth (for non-browser clients)
        if (!rawToken && socket.handshake.auth?.token) {
            rawToken = socket.handshake.auth.token;
            matchedCookieName = tokenCookieNames[1]; // default to dev cookie name
        }

        if (!rawToken) {
            console.warn("[Socket.io Auth] No session token found");
            return next(new Error("Authentication required"));
        }

        // Decode the JWT using NextAuth's decode function
        // The salt MUST match the actual cookie name used (differs between HTTP/HTTPS)
        const decoded = await decode({
            token: rawToken,
            secret,
            salt: matchedCookieName!, // NextAuth uses cookie name as salt
        });

        if (!decoded || !decoded.sub) {
            console.warn("[Socket.io Auth] Invalid token — no sub claim");
            return next(new Error("Invalid session"));
        }

        // Store verified identity on socket.data (typed, not `as any`)
        socket.data.userId = decoded.sub;
        socket.data.userName = (decoded.name as string) || "Anonymous";
        socket.data.userImage = (decoded.picture as string) || undefined;

        next();
    } catch (error) {
        console.error("[Socket.io Auth] Middleware error:", error);
        next(new Error("Authentication failed"));
    }
}
