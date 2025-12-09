// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// GET /api/documents - List all documents for the current user
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Ensure user exists in database
        const userId = await ensureUser(session.user as any);

        const documents = await prisma.document.findMany({
            where: { authorId: userId },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                title: true,
                isPublic: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(documents);
    } catch (error) {
        console.error("[API/documents] Error:", error);
        return NextResponse.json({
            error: "Failed to fetch documents",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// POST /api/documents - Create a new document
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Ensure user exists in database
        const userId = await ensureUser(session.user as any);

        const body = await req.json();
        const { title, content } = body;

        const document = await prisma.document.create({
            data: {
                title: title || "Untitled Document",
                content: content || "",
                authorId: userId,
            },
        });

        // Record creation in history
        await prisma.documentHistory.create({
            data: {
                documentId: document.id,
                userId: userId,
                action: "created",
                details: null,
            },
        });

        return NextResponse.json(document);
    } catch (error) {
        console.error("[API/documents] Error:", error);
        return NextResponse.json({
            error: "Failed to create document",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
