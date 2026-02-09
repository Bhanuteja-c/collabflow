// src/app/api/workspaces/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper to check workspace access
async function checkWorkspaceAccess(workspaceId: string, userId: string) {
    const membership = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: { workspaceId, userId },
        },
    });
    return membership;
}

// GET /api/workspaces/[slug] - Get workspace details (supports both id and slug)
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
        const id = slug; // Treat the param as the ID/Slug
        const userId = (session.user as { id: string }).id;

        // Support both id (cuid) and slug lookup
        // CUIDs are typically 25 characters, slugs are usually shorter and may have different characters
        const isCuid = id.length === 25 && /^[a-z0-9]+$/.test(id);

        const workspace = await prisma.workspace.findFirst({
            where: isCuid ? { id } : { slug: id },
            include: {
                owner: {
                    select: { id: true, name: true, image: true, email: true },
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, image: true, email: true },
                        },
                    },
                    orderBy: { joinedAt: "asc" },
                },
                _count: {
                    select: { documents: true, boards: true, channels: true },
                },
            },
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // Check access
        const membership = await checkWorkspaceAccess(workspace.id, userId);
        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        return NextResponse.json({ ...workspace, userRole: membership.role });
    } catch (error) {
        console.error("Get workspace error:", error);
        return NextResponse.json({ error: "Failed to fetch workspace" }, { status: 500 });
    }
}

// PUT /api/workspaces/[slug] - Update workspace
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { slug } = await params;
        const id = slug;
        const userId = (session.user as { id: string }).id;
        const body = await request.json();

        // Check admin/owner access
        const membership = await checkWorkspaceAccess(id, userId);
        if (!membership || !["owner", "admin"].includes(membership.role)) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const { name, description, image, isPublic } = body;
        const updateData: any = {};

        if (name) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (image !== undefined) updateData.image = image;
        if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);

        const workspace = await prisma.workspace.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(workspace);
    } catch (error) {
        console.error("Update workspace error:", error);
        return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
    }
}

// DELETE /api/workspaces/[slug] - Delete workspace
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
        const id = slug;
        const userId = (session.user as { id: string }).id;

        // Only owner can delete
        const workspace = await prisma.workspace.findUnique({
            where: { id },
            select: { ownerId: true },
        });

        if (!workspace || workspace.ownerId !== userId) {
            return NextResponse.json({ error: "Only the owner can delete workspace" }, { status: 403 });
        }

        await prisma.workspace.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete workspace error:", error);
        return NextResponse.json({ error: "Failed to delete workspace" }, { status: 500 });
    }
}
