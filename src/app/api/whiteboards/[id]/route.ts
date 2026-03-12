// src/app/api/whiteboards/[id]/route.ts
// Get, update, or delete a whiteboard

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const whiteboard = await prisma.whiteboard.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            yjsState: true,
            workspaceId: true,
            createdAt: true,
            updatedAt: true,
            createdBy: { select: { id: true, name: true, image: true } },
        },
    });

    if (!whiteboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Convert Bytes to array for JSON transport
    return NextResponse.json({
        ...whiteboard,
        yjsState: whiteboard.yjsState ? Array.from(whiteboard.yjsState) : null,
    });
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.yjsState !== undefined) {
        data.yjsState = Buffer.from(body.yjsState);
    }

    const whiteboard = await prisma.whiteboard.update({
        where: { id },
        data,
        select: {
            id: true,
            title: true,
            updatedAt: true,
        },
    });

    return NextResponse.json(whiteboard);
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    await prisma.whiteboard.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
