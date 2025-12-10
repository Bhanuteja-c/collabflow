// src/app/api/pusher/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { ensureUser } from "@/lib/ensureUser";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const data = await req.text();

        // Parse the body to get socket_id and channel_name
        // Next.js body parsing for x-www-form-urlencoded
        const [socketId, channelName] = data
            .split('&')
            .map(part => part.split('=')[1]);

        const presenceData = {
            user_id: userId,
            user_info: {
                name: session.user.name,
                image: session.user.image,
            },
        };

        const authResponse = pusherServer.authorizeChannel(
            socketId,
            channelName,
            presenceData
        );

        return NextResponse.json(authResponse);
    } catch (error) {
        console.error("[API/pusher/auth] Error:", error);
        return NextResponse.json({ error: "Auth failed" }, { status: 500 });
    }
}
