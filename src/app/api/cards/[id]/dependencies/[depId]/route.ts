// src/app/api/cards/[id]/dependencies/[depId]/route.ts
// DELETE: Remove a card dependency
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// DELETE /api/cards/[id]/dependencies/[depId]
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; depId: string }> }
) {
    try {
        const session = await auth();
        const { id, depId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Verify the dependency exists and belongs to this card
        const dependency = await prisma.cardDependency.findUnique({
            where: { id: depId },
        });

        if (!dependency) {
            return NextResponse.json({ error: "Dependency not found" }, { status: 404 });
        }

        // Ensure the dependency involves this card
        if (dependency.predecessorId !== id && dependency.successorId !== id) {
            return NextResponse.json({ error: "Dependency does not belong to this card" }, { status: 403 });
        }

        // Get the other card ID before deletion
        const targetCardId = dependency.predecessorId === id ? dependency.successorId : dependency.predecessorId;

        await prisma.cardDependency.delete({ where: { id: depId } });

        // Fetch workspace to emit real-time updates
        const sourceCard = await prisma.card.findUnique({
            where: { id },
            include: {
                board: { select: { workspaceId: true } },
                column: { select: { board: { select: { workspaceId: true } } } },
            }
        });

        const workspaceId = sourceCard?.board?.workspaceId || sourceCard?.column?.board?.workspaceId;

        if (workspaceId && sourceCard) {
            // Fetch explicit counts
            const [sourceDependsOn, sourceDependedBy, targetDependsOn, targetDependedBy] = await Promise.all([
                prisma.cardDependency.count({ where: { predecessorId: id } }),
                prisma.cardDependency.count({ where: { successorId: id } }),
                prisma.cardDependency.count({ where: { predecessorId: targetCardId } }),
                prisma.cardDependency.count({ where: { successorId: targetCardId } })
            ]);

            const { emitToWorkspace } = await import("@/lib/socket");
            emitToWorkspace(workspaceId, "card-dependency-updated", {
                workspaceId,
                cardId: id,
                dependencyCount: sourceDependsOn + sourceDependedBy,
                isBlocked: sourceDependedBy > 0,
                targetCardId,
                targetDependencyCount: targetDependsOn + targetDependedBy,
                targetIsBlocked: targetDependedBy > 0,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting dependency:", error);
        return NextResponse.json({ error: "Failed to delete dependency" }, { status: 500 });
    }
}
