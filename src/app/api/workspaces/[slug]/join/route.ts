// src/app/api/workspaces/[slug]/join/route.ts
// POST to join a public workspace
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { Activity } from "@/lib/activity";

// POST /api/workspaces/[slug]/join - Join a public workspace
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        const { slug } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Find workspace
        const workspace = await prisma.workspace.findUnique({
            where: { slug },
            include: {
                members: {
                    where: { userId },
                    select: { id: true }
                }
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // Check if already a member
        if (workspace.members.length > 0) {
            return NextResponse.json({ error: "Already a member" }, { status: 400 });
        }

        // Check if workspace is public
        if (!workspace.isPublic) {
            return NextResponse.json({ error: "This workspace is not public" }, { status: 403 });
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
