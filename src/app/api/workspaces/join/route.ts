// src/app/api/workspaces/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { notifyWorkspaceMembers } from "@/lib/notifications";

// POST /api/workspaces/join - Join an existing workspace
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const body = await request.json();
        const { code } = body;

        if (!code || code.trim().length < 2) {
            return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
        }

        const trimmedCode = code.trim();
        const lowerCode = trimmedCode.toLowerCase();

        // Find workspace by slug or invite code
        const workspace = await (prisma.workspace as any).findFirst({
            where: {
                OR: [
                    { slug: lowerCode },
                    { slug: { contains: lowerCode } },
                    { inviteCode: trimmedCode } // IMPORTANT: Check invite code
                ],
            },
            include: {
                members: {
                    where: { userId },
                },
            },
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // Check if user is already a member
        if (workspace.members.length > 0) {
            return NextResponse.json({
                message: "Already a member",
                slug: workspace.slug
            });
        }

        // Add user as member
        await prisma.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId,
                role: "member",
            },
        });

        // Notify existing members about new member
        await notifyWorkspaceMembers(
            workspace.id,
            userId,
            "new_member",
            `${session.user.name || "Someone"} joined ${workspace.name}`,
            `A new member has joined your workspace`,
            `/workspace/${workspace.slug}/members`
        );

        return NextResponse.json({
            message: "Joined successfully",
            slug: workspace.slug
        });
    } catch (error) {
        console.error("Join workspace error:", error);
        return NextResponse.json({ error: "Failed to join workspace" }, { status: 500 });
    }
}

