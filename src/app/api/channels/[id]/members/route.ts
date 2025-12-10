// src/app/api/channels/[id]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// GET /api/channels/[id]/members - Get channel members
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Check if user is member
        const membership = await prisma.channelMember.findUnique({
            where: { channelId_userId: { channelId: id, userId } },
        });

        if (!membership) {
            return NextResponse.json({ error: "Not a member" }, { status: 403 });
        }

        const members = await prisma.channelMember.findMany({
            where: { channelId: id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
            },
        });

        return NextResponse.json(members);
    } catch (error) {
        console.error("[API/channels/members] Error:", error);
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }
}

// POST /api/channels/[id]/members - Add a member to channel
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const body = await req.json();
        const { email } = body;

        if (!email?.trim()) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Check if current user is admin of channel
        const adminCheck = await prisma.channelMember.findUnique({
            where: { channelId_userId: { channelId: id, userId } },
        });

        if (!adminCheck || adminCheck.role !== "admin") {
            return NextResponse.json({ error: "Only admins can add members" }, { status: 403 });
        }

        // Find user by email
        const userToAdd = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });

        if (!userToAdd) {
            return NextResponse.json({ error: "User not found with that email" }, { status: 404 });
        }

        // Check if already member
        const existingMember = await prisma.channelMember.findUnique({
            where: { channelId_userId: { channelId: id, userId: userToAdd.id } },
        });

        if (existingMember) {
            return NextResponse.json({ error: "User is already a member" }, { status: 400 });
        }

        // Add member
        const member = await prisma.channelMember.create({
            data: {
                channelId: id,
                userId: userToAdd.id,
                role: "member",
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
            },
        });

        return NextResponse.json(member);
    } catch (error) {
        console.error("[API/channels/members] Error:", error);
        return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
    }
}
