// src/app/api/workspaces/[slug]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Activity } from "@/lib/activity";

// Helper to resolve slug to ID
async function resolveWorkspaceId(slugOrId: string) {
    // Basic CUID check
    const isCuid = slugOrId.length === 25 && /^[a-z0-9]+$/.test(slugOrId);
    if (isCuid) return slugOrId;

    const workspace = await prisma.workspace.findUnique({
        where: { slug: slugOrId },
        select: { id: true }
    });
    return workspace?.id;
}

// Helper to check admin/owner access
async function checkAdminAccess(workspaceId: string, userId: string) {
    const membership = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: { workspaceId, userId },
        },
    });
    return membership && ["owner", "admin"].includes(membership.role);
}

// GET /api/workspaces/[slug]/members - List members
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { slug } = await params;
        const workspaceId = await resolveWorkspaceId(slug);

        if (!workspaceId) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        const userId = (session.user as { id: string }).id;

        // Check membership
        const isMember = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (!isMember) {
            return NextResponse.json({ error: "Not a member" }, { status: 403 });
        }

        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
            },
            orderBy: { joinedAt: "asc" },
        });

        return NextResponse.json(members);
    } catch (error) {
        console.error("Get members error:", error);
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }
}

// POST /api/workspaces/[slug]/members - Add member by email
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { slug } = await params;
        const workspaceId = await resolveWorkspaceId(slug);

        if (!workspaceId) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        const userId = (session.user as { id: string }).id;
        const body = await request.json();

        // Check admin access
        if (!await checkAdminAccess(workspaceId, userId)) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const { email, role = "member" } = body;
        if (!email) {
            return NextResponse.json({ error: "Email required" }, { status: 400 });
        }

        // Find user by email
        const targetUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, image: true },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if already a member
        const existing = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: targetUser.id } },
        });

        if (existing) {
            return NextResponse.json({ error: "Already a member" }, { status: 400 });
        }

        // Add member
        const member = await prisma.workspaceMember.create({
            data: {
                workspaceId,
                userId: targetUser.id,
                role: ["admin", "member", "viewer"].includes(role) ? role : "member",
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
            },
        });

        // Log activity
        Activity.memberJoined(targetUser.id, workspaceId, targetUser.name || targetUser.email || "A new member");

        return NextResponse.json(member, { status: 201 });
    } catch (error) {
        console.error("Add member error:", error);
        return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
    }
}

// DELETE /api/workspaces/[slug]/members?userId=xxx - Remove member
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { slug } = await params;
        const workspaceId = await resolveWorkspaceId(slug);

        if (!workspaceId) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        const currentUserId = (session.user as { id: string }).id;
        const targetUserId = request.nextUrl.searchParams.get("userId");

        if (!targetUserId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        // Get workspace to check owner
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { ownerId: true },
        });

        if (!workspace) {
            // Should be caught by resolveWorkspaceId generally, but safe to keep
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // Cannot remove owner
        if (targetUserId === workspace.ownerId) {
            return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });
        }

        // Self-removal or admin removal
        const isAdmin = await checkAdminAccess(workspaceId, currentUserId);
        const isSelfRemoval = currentUserId === targetUserId;

        if (!isAdmin && !isSelfRemoval) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        await prisma.workspaceMember.delete({
            where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Remove member error:", error);
        return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }
}

// PATCH /api/workspaces/[slug]/members - Update member role
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { slug } = await params;
        const workspaceId = await resolveWorkspaceId(slug);

        if (!workspaceId) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        const currentUserId = (session.user as { id: string }).id;
        const body = await request.json();

        // Check admin access
        if (!await checkAdminAccess(workspaceId, currentUserId)) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const { userId: targetUserId, role } = body;
        if (!targetUserId || !role) {
            return NextResponse.json({ error: "userId and role required" }, { status: 400 });
        }

        // Get workspace to check owner
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { ownerId: true },
        });

        // Cannot change owner's role
        if (targetUserId === workspace?.ownerId) {
            return NextResponse.json({ error: "Cannot change owner's role" }, { status: 400 });
        }

        const member = await prisma.workspaceMember.update({
            where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
            data: { role },
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
            },
        });

        return NextResponse.json(member);
    } catch (error) {
        console.error("Update member role error:", error);
        return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }
}
