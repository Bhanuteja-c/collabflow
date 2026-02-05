// src/app/api/cards/[id]/comments/[commentId]/route.ts
// Delete a comment
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE - Delete a comment
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; commentId: string }> }
) {
    try {
        const session = await auth();
        const { commentId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify the comment belongs to the user
        const comment = await prisma.cardComment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        if (comment.authorId !== session.user.id) {
            return NextResponse.json({ error: "Not authorized to delete this comment" }, { status: 403 });
        }

        await prisma.cardComment.delete({
            where: { id: commentId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting comment:", error);
        return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
    }
}
