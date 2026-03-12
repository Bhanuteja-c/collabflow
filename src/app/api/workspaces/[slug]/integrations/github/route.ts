// src/app/api/workspaces/[slug]/integrations/github/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

async function verifyWorkspaceAdmin(slug: string, userId: string) {
    const isCuid = slug.length === 25 && /^[a-z0-9]+$/.test(slug);
    return await prisma.workspace.findFirst({
        where: isCuid ? { id: slug } : { slug },
        include: {
            members: {
                where: { userId },
                select: { id: true, role: true }
            }
        }
    });
}

// GET current integration status
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        const { slug } = await params;
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const workspace = await verifyWorkspaceAdmin(slug, session.user.id);
        if (!workspace || workspace.members.length === 0) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const integration = await prisma.gitHubIntegration.findFirst({
            where: { workspaceId: workspace.id }
        });

        return NextResponse.json({ integration });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST to create or regenerate webhook secret
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        const { slug } = await params;
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const workspace = await verifyWorkspaceAdmin(slug, session.user.id);
        if (!workspace || workspace.members.length === 0) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { action } = body; // "create", "regenerate", "toggle"

        const existing = await prisma.gitHubIntegration.findFirst({
            where: { workspaceId: workspace.id }
        });

        if (action === "toggle" && existing) {
            const updated = await prisma.gitHubIntegration.update({
                where: { id: existing.id },
                data: { enabled: !existing.enabled }
            });
            return NextResponse.json({ integration: updated });
        }

        // Generate a random 32-byte secret (hex)
        const secret = crypto.randomBytes(32).toString("hex");

        if (existing) {
            const updated = await prisma.gitHubIntegration.update({
                where: { id: existing.id },
                data: { webhookSecret: secret }
            });
            return NextResponse.json({ integration: updated });
        }

        const newIntegration = await prisma.gitHubIntegration.create({
            data: {
                workspaceId: workspace.id,
                webhookSecret: secret,
                enabled: true
            }
        });

        return NextResponse.json({ integration: newIntegration });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE integration entirely
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        const { slug } = await params;
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const workspace = await verifyWorkspaceAdmin(slug, session.user.id);
        if (!workspace || workspace.members.length === 0) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.gitHubIntegration.deleteMany({
            where: { workspaceId: workspace.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
