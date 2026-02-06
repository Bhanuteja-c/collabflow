// src/app/api/channels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// GET /api/channels - List workspace channels
export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Get workspaceId from query params
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        // Build where clause - either filter by workspace or by membership
        const whereClause = workspaceId
            ? {
                workspaceId,
                // User must be a workspace member to see workspace channels
                workspace: {
                    members: {
                        some: { userId }
                    }
                }
            }
            : {
                // Fallback: channels where user is a direct member
                members: {
                    some: { userId },
                },
            };

        const channels = await prisma.channel.findMany({
            where: whereClause,
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, image: true },
                        },
                    },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: {
                        author: {
                            select: { id: true, name: true, image: true },
                        },
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(channels);
    } catch (error) {
        console.error("[API/channels] Error:", error);
        return NextResponse.json({
            error: "Failed to fetch channels",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// POST /api/channels - Create a new channel
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const body = await req.json();
        const { name, type = "public", workspaceId } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
        }

        // If workspace is specified, verify membership and get all workspace members
        let memberConnections: { userId: string; role: string }[] = [
            { userId, role: "admin" }
        ];

        if (workspaceId) {
            // Verify user is a workspace member
            const membership = await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: { workspaceId, userId }
                }
            });

            if (!membership) {
                return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });
            }

            // Get all workspace members to add them to the channel
            const workspaceMembers = await prisma.workspaceMember.findMany({
                where: { workspaceId },
                select: { userId: true }
            });

            // Add all workspace members to the channel
            memberConnections = workspaceMembers.map(m => ({
                userId: m.userId,
                role: m.userId === userId ? "admin" : "member"
            }));
        }

        const channel = await prisma.channel.create({
            data: {
                name: name.trim(),
                type,
                workspaceId: workspaceId || null,
                createdById: userId,
                members: {
                    create: memberConnections,
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, image: true },
                        },
                    },
                },
            },
        });

        return NextResponse.json(channel);
    } catch (error) {
        console.error("[API/channels] Error:", error);
        return NextResponse.json({
            error: "Failed to create channel",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

