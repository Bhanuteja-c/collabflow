// src/app/api/workspaces/[slug]/files/[id]/route.ts
// Delete a file from Azure Blob Storage and the database
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BlobServiceClient } from "@azure/storage-blob";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { slug, id } = await params;
        const userId = session.user.id;

        // Find workspace
        const workspace = await prisma.workspace.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // Verify membership and get role
        const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
        });

        if (!membership) {
            return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });
        }

        // Find the file
        const file = await prisma.file.findUnique({
            where: { id },
        });

        if (!file || file.workspaceId !== workspace.id) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // Permission check: admins/owners can delete any file,
        // members can only delete their own uploads
        const canDelete =
            ["owner", "admin"].includes(membership.role) ||
            file.uploadedById === userId;

        if (!canDelete) {
            return NextResponse.json(
                { error: "You can only delete files you uploaded" },
                { status: 403 }
            );
        }

        // Delete from Azure Blob Storage
        const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (connStr) {
            try {
                const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
                const containerClient = blobServiceClient.getContainerClient("uploads");
                const blockBlobClient = containerClient.getBlockBlobClient(file.name);
                await blockBlobClient.deleteIfExists();
            } catch (blobErr) {
                console.error("[API/files/delete] Blob deletion failed:", blobErr);
                // Continue to delete DB record even if blob deletion fails
            }
        }

        // Delete from database
        await prisma.file.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[API/files/delete] Error:", error);
        return NextResponse.json(
            { error: "Failed to delete file" },
            { status: 500 }
        );
    }
}
