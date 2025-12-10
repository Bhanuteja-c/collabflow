// src/app/api/conversations/route.ts
// API for managing Direct Message conversations
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// GET /api/conversations - List all DM conversations for the current user
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentUserId = await ensureUser(session.user as any);

        // Find all "direct" channels where user is a member
        const conversations = await prisma.channel.findMany({
            where: {
                type: "direct",
                members: {
                    some: { userId: currentUserId }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, image: true }
                        }
                    }
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                    select: { content: true, createdAt: true }
                }
            },
            orderBy: { updatedAt: "desc" }
        });

        // Transform to include the "other" user info
        const result = conversations.map(conv => {
            const otherMember = conv.members.find(m => m.userId !== currentUserId);
            return {
                id: conv.id,
                otherUser: otherMember?.user || null,
                lastMessage: conv.messages[0] || null,
                updatedAt: conv.updatedAt
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[API/conversations] GET Error:", error);
        return NextResponse.json({
            error: "Failed to fetch conversations",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// POST /api/conversations - Start or get a DM with a user
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentUserId = await ensureUser(session.user as any);

        const body = await req.json();
        const { userId: targetUserId } = body;

        if (!targetUserId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        if (targetUserId === currentUserId) {
            return NextResponse.json({ error: "Cannot start a conversation with yourself" }, { status: 400 });
        }

        // Check if target user exists
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if a DM channel already exists between these two users
        const existingChannel = await prisma.channel.findFirst({
            where: {
                type: "direct",
                AND: [
                    { members: { some: { userId: currentUserId } } },
                    { members: { some: { userId: targetUserId } } }
                ]
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, image: true } }
                    }
                }
            }
        });

        if (existingChannel) {
            const otherMember = existingChannel.members.find(m => m.userId !== currentUserId);
            return NextResponse.json({
                id: existingChannel.id,
                otherUser: otherMember?.user || null,
                isNew: false
            });
        }

        // Create new DM channel
        const newChannel = await prisma.channel.create({
            data: {
                name: `dm-${currentUserId}-${targetUserId}`,
                type: "direct",
                createdById: currentUserId,
                members: {
                    create: [
                        { userId: currentUserId },
                        { userId: targetUserId }
                    ]
                }
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, image: true } }
                    }
                }
            }
        });

        const otherMember = newChannel.members.find(m => m.userId !== currentUserId);
        return NextResponse.json({
            id: newChannel.id,
            otherUser: otherMember?.user || null,
            isNew: true
        });
    } catch (error) {
        console.error("[API/conversations] POST Error:", error);
        return NextResponse.json({
            error: "Failed to create conversation",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
