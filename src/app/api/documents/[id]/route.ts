// src/app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/documents/[id] - Get a single document
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        console.log("[API/documents/id] GET - id:", id, "user:", session?.user?.id);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const document = await prisma.document.findFirst({
            where: {
                id,
                OR: [
                    { authorId: session.user.id },
                    { isPublic: true },
                ],
            },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        return NextResponse.json(document);
    } catch (error) {
        console.error("[API/documents/id] GET Error:", error);
        return NextResponse.json({
            error: "Failed to fetch document",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// PUT /api/documents/[id] - Update a document
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        console.log("[API/documents/id] PUT - id:", id, "user:", session?.user?.id);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, content, isPublic } = body;

        // Check ownership
        const existing = await prisma.document.findFirst({
            where: { id, authorId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Document not found or not authorized" }, { status: 404 });
        }

        // Determine what changed for history
        let action = "edited";
        let details: string | null = null;

        if (title !== undefined && title !== existing.title) {
            action = "renamed";
            details = `Changed title from "${existing.title}" to "${title}"`;
        }

        const document = await prisma.document.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(content !== undefined && { content }),
                ...(isPublic !== undefined && { isPublic }),
            },
        });

        // Record history entry
        await prisma.documentHistory.create({
            data: {
                documentId: id,
                userId: session.user.id,
                action,
                details,
            },
        });

        return NextResponse.json(document);
    } catch (error) {
        console.error("[API/documents/id] PUT Error:", error);
        return NextResponse.json({
            error: "Failed to update document",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        console.log("[API/documents/id] DELETE - id:", id, "user:", session?.user?.id);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized - please sign out and sign in again" }, { status: 401 });
        }

        // Check ownership
        const existing = await prisma.document.findFirst({
            where: { id, authorId: session.user.id },
        });

        console.log("[API/documents/id] DELETE - existing:", existing?.id);

        if (!existing) {
            return NextResponse.json({ error: "Document not found or not authorized" }, { status: 404 });
        }

        // Delete history first (if not cascading)
        await prisma.documentHistory.deleteMany({ where: { documentId: id } });

        // Then delete document
        await prisma.document.delete({ where: { id } });

        console.log("[API/documents/id] DELETE - success");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[API/documents/id] DELETE Error:", error);
        return NextResponse.json({
            error: "Failed to delete document",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
