// src/app/api/workspaces/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/workspaces - List workspaces for current user
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;

        // Get workspaces where user is owner or member
        const workspaces = await prisma.workspace.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            include: {
                owner: {
                    select: { id: true, name: true, image: true },
                },
                _count: {
                    select: { members: true, documents: true, boards: true },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(workspaces);
    } catch (error) {
        console.error("Get workspaces error:", error);
        return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
    }
}

// POST /api/workspaces - Create a new workspace
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const body = await request.json();
        const { name, description } = body;

        if (!name || name.trim().length < 2) {
            return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
        }

        // Generate slug from name
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        // Check for slug uniqueness and add random suffix if needed
        let slug = baseSlug;
        let slugExists = await prisma.workspace.findUnique({ where: { slug } });
        if (slugExists) {
            slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
        }

        // Create workspace and add owner as member
        const workspace = await prisma.workspace.create({
            data: {
                name: name.trim(),
                slug,
                description: description?.trim() || null,
                ownerId: userId,
                members: {
                    create: {
                        userId,
                        role: "owner",
                    },
                },
                // Create default channel
                channels: {
                    create: {
                        name: "general",
                        type: "public",
                        createdById: userId,
                    },
                },
            },
            include: {
                owner: {
                    select: { id: true, name: true, image: true },
                },
            },
        });

        return NextResponse.json(workspace, { status: 201 });
    } catch (error) {
        console.error("Create workspace error:", error);
        return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
    }
}
