// POST /api/documents/[id]/star — Toggle starred status for a document
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;
    const userId = await ensureUser(session.user as any);

    try {
        // Check if already starred
        const existing = await prisma.documentStar.findUnique({
            where: {
                documentId_userId: { documentId, userId },
            },
        });

        if (existing) {
            // Unstar
            await prisma.documentStar.delete({ where: { id: existing.id } });
            return NextResponse.json({ starred: false });
        }

        // Star
        await prisma.documentStar.create({
            data: { documentId, userId },
        });

        return NextResponse.json({ starred: true });
    } catch (error) {
        console.error("Star toggle error:", error);
        return NextResponse.json({ error: "Failed to toggle star" }, { status: 500 });
    }
}
