// src/app/api/workspaces/[id]/join/route.ts
// POST to join a public workspace
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { Activity } from "@/lib/activity";

// POST /api/workspaces/[slug]/join
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
        const id = slug; // Treat as ID/Slug
        const userId = (session.user as { id: string }).id;
        // Parse body (inviteCode support)
        const body = await request.json().catch(() => ({}));
        const inviteCode = body?.code?.trim();

        // 1. Find workspace (by ID or Slug)
        const isCuid = id.length === 25 && /^[a-z0-9]+$/.test(id);
        const whereClause = isCuid ? { id } : { slug: id };

        const workspace = await prisma.workspace.findFirst({
            where: whereClause,
            include: {
                members: {
                    where: { userId },
                    select: { id: true }
                }
            }
        }) as any; // Cast to any to allow access to inviteCode

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // Check if already a member
        if (workspace.members.length > 0) {
            return NextResponse.json({ error: "Already a member" }, { status: 400 });
        }

        // Check if workspace is public OR inviteCode matches
        const isValidInvite = inviteCode && inviteCode === workspace.inviteCode;
        if (!workspace.isPublic && !isValidInvite) {
            return NextResponse.json({ error: "This workspace is not public or invalid invite code" }, { status: 403 });
        }

        // Add as member
        await prisma.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId,
                role: "member",
            },
        });

        // Log activity
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
        });
        Activity.memberJoined(userId, workspace.id, user?.name || "A user");

        return NextResponse.json({
            success: true,
            message: "Successfully joined workspace",
            workspace: {
                id: workspace.id,
                name: workspace.name,
                slug: workspace.slug,
            }
        });
    } catch (error) {
        console.error("Error joining workspace:", error);
        return NextResponse.json({ error: "Failed to join workspace" }, { status: 500 });
    }
}
