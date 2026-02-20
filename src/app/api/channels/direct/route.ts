import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/channels/direct
// Create or get a direct message channel with another user
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session.user as any).id as string;
        
        const { targetUserId, workspaceId } = await req.json();

        if (!targetUserId || !workspaceId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Check if a direct channel already exists between these two users in this workspace
        const existingChannels = await prisma.channel.findMany({
            where: {
                workspaceId,
                type: "direct",
                members: {
                    some: { userId: userId }
                }
            },
            include: {
                members: true
            }
        });

        // Filter in JS to strictly verify the EXACT two members (no more, no less)
        let directChannel = existingChannels.find(ch => 
            ch.members.length === 2 && 
            ch.members.some(m => m.userId === targetUserId)
        );

        // 2. If it doesn't exist, create it
        if (!directChannel) {
            // Get the target user's name for a temporary channel name (optional, as UI handles it)
            const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }});
            
            directChannel = await prisma.channel.create({
                data: {
                    name: `DM-${userId}-${targetUserId}`, // Internal name, UI hides this
                    type: "direct",
                    workspaceId,
                    members: {
                        create: [
                            { userId: userId, role: "admin" },
                            { userId: targetUserId, role: "member" }
                        ]
                    }
                },
                include: {
                    members: true
                }
            });
        }

        // Return the full channel structure so the UI can inject it into state
        const completeChannel = await prisma.channel.findUnique({
             where: { id: directChannel.id },
             include: {
                 members: {
                     include: {
                         user: { select: { id: true, name: true, image: true } }
                     }
                 },
                 messages: {
                     orderBy: { createdAt: "desc" },
                     take: 1,
                     include: { author: { select: { id: true, name: true, image: true } } }
                 }
             }
        });

        return NextResponse.json(completeChannel);

    } catch (error) {
        console.error("[API/channels/direct] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
