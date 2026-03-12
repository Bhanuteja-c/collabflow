// src/app/api/workspaces/[slug]/whiteboards/route.ts
// List and create whiteboards in a workspace

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const workspace = await prisma.workspace.findUnique({
        where: { slug },
        select: { id: true },
    });
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const whiteboards = await prisma.whiteboard.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            createdBy: { select: { id: true, name: true, image: true } },
        },
    });

    return NextResponse.json(whiteboards);
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const userId = session.user.id;

    const workspace = await prisma.workspace.findUnique({
        where: { slug },
        select: { id: true },
    });
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    const whiteboard = await prisma.whiteboard.create({
        data: {
            title: body.title || "Untitled Whiteboard",
            workspaceId: workspace.id,
            createdById: userId,
        },
        select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            createdBy: { select: { id: true, name: true, image: true } },
        },
    });

    return NextResponse.json(whiteboard, { status: 201 });
}
