// src/app/api/cards/[id]/details/route.ts
// GET card details with comments, checklist, and workspace access control
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { checkCardWorkspaceAccess } from "@/lib/workspaceAccess";

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

        const userId = await ensureUser(session.user as any);

        // Check workspace access
        const cardAccess = await checkCardWorkspaceAccess(id, userId);
        if (!cardAccess) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        const card = await prisma.card.findUnique({
            where: { id },
            include: {
                comments: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
                checklist: {
                    orderBy: { order: "asc" },
                },
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                column: {
                    select: {
                        title: true,
                    },
                },
            },
        });

        if (!card) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        return NextResponse.json(card);
    } catch (error) {
        console.error("Error fetching card details:", error);
        return NextResponse.json({ error: "Failed to fetch card details" }, { status: 500 });
    }
}
