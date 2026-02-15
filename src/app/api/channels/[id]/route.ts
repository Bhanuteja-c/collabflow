// PUT /api/channels/[id] — Update a channel (description, name, etc.)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = await ensureUser(session.user as any);

    try {
        // Verify membership
        const membership = await prisma.channelMember.findUnique({
            where: { channelId_userId: { channelId: id, userId } },
        });

        if (!membership) {
            return NextResponse.json({ error: "Not a channel member" }, { status: 403 });
        }

        const body = await req.json();
        const { description, name } = body;

        const updateData: any = {};
        if (description !== undefined) updateData.description = description;
        if (name?.trim()) updateData.name = name.trim();

        const channel = await prisma.channel.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(channel);
    } catch (error) {
        console.error("Channel update error:", error);
        return NextResponse.json({ error: "Failed to update channel" }, { status: 500 });
    }
}
