// src/app/api/documents/[id]/share/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/documents/[id]/share - List all shares for a document
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only owner can see shares
        const document = await prisma.document.findFirst({
            where: { id, authorId: session.user.id },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found or not authorized" }, { status: 404 });
        }

        const shares = await prisma.documentShare.findMany({
            where: { documentId: id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(shares);
    } catch (error) {
        console.error("[API/documents/id/share] GET Error:", error);
        return NextResponse.json({
            error: "Failed to fetch shares",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// POST /api/documents/[id]/share - Add a share
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { email, permission = "view" } = body;

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        if (!["view", "edit"].includes(permission)) {
            return NextResponse.json({ error: "Permission must be 'view' or 'edit'" }, { status: 400 });
        }

        // Only owner can share
        const document = await prisma.document.findFirst({
            where: { id, authorId: session.user.id },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found or not authorized" }, { status: 404 });
        }

        // Find user by email
        const targetUser = await prisma.user.findUnique({
            where: { email },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found. They need to sign up first." }, { status: 404 });
        }

        if (targetUser.id === session.user.id) {
            return NextResponse.json({ error: "You can't share with yourself" }, { status: 400 });
        }

        // Create or update share
        const share = await prisma.documentShare.upsert({
            where: {
                documentId_userId: {
                    documentId: id,
                    userId: targetUser.id
                }
            },
            update: { permission },
            create: {
                documentId: id,
                userId: targetUser.id,
                permission
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true }
                }
            }
        });

        return NextResponse.json(share);
    } catch (error) {
        console.error("[API/documents/id/share] POST Error:", error);
        return NextResponse.json({
            error: "Failed to share document",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// DELETE /api/documents/[id]/share - Remove a share
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        // Only owner can remove shares
        const document = await prisma.document.findFirst({
            where: { id, authorId: session.user.id },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found or not authorized" }, { status: 404 });
        }

        await prisma.documentShare.delete({
            where: {
                documentId_userId: {
                    documentId: id,
                    userId
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[API/documents/id/share] DELETE Error:", error);
        return NextResponse.json({
            error: "Failed to remove share",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
