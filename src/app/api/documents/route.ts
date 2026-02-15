// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { Activity } from "@/lib/activity";

// GET /api/documents - List documents (optionally filtered by workspace)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Get query params
        const searchParams = request.nextUrl.searchParams;
        const workspaceId = searchParams.get("workspaceId");
        const limit = parseInt(searchParams.get("limit") || "50");

        // Build where clause
        const where: any = {};

        if (workspaceId) {
            // Check workspace membership
            const membership = await prisma.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId, userId } },
            });
            if (!membership) {
                return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });
            }
            where.workspaceId = workspaceId;
        } else {
            // Personal docs (no workspace) or authored by user
            where.OR = [
                { authorId: userId, workspaceId: null },
                { shares: { some: { userId } } },
            ];
        }

        const documents = await prisma.document.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            take: limit,
            select: {
                id: true,
                title: true,
                isPublic: true,
                workspaceId: true,
                createdAt: true,
                updatedAt: true,
                author: {
                    select: { id: true, name: true, image: true },
                },
                stars: {
                    where: { userId },
                    select: { id: true },
                },
            },
        });

        // Flatten stars to isStarred boolean
        const docsWithStars = documents.map(doc => ({
            ...doc,
            isStarred: doc.stars.length > 0,
            stars: undefined,
        }));

        return NextResponse.json(docsWithStars);
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

        const userId = await ensureUser(session.user as any);

        const body = await req.json();
        const { title, content, workspaceId } = body;

        // If workspaceId provided, verify membership
        if (workspaceId) {
            const membership = await prisma.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId, userId } },
            });
            if (!membership || membership.role === "viewer") {
                return NextResponse.json({ error: "Permission denied" }, { status: 403 });
            }
        }

        const document = await prisma.document.create({
            data: {
                title: title || "Untitled Document",
                content: content || "",
                authorId: userId,
                workspaceId: workspaceId || null,
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

        // Log activity
        if (workspaceId) {
            Activity.documentCreated(userId, workspaceId, document.id, document.title);
        }

        return NextResponse.json(document);
    } catch (error) {
        console.error("[API/documents] Error:", error);
        return NextResponse.json({
            error: "Failed to create document",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
