// src/app/api/user/profile/route.ts
// Update the current user's profile (image, name, etc.)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { image, name, handle, bio, status } = body;

        // Build update payload — only include provided fields
        const updateData: Record<string, any> = {};
        if (typeof image === "string") updateData.image = image;
        if (typeof name === "string" && name.trim()) updateData.name = name.trim();
        if (typeof bio === "string") updateData.bio = bio.trim().slice(0, 160); // Max 160 chars
        if (typeof status === "string") updateData.status = status;
        
        // Handle validation
        if (handle !== undefined) {
            if (handle === null || handle.trim() === "") {
                updateData.handle = null; // Clear handle
            } else {
                const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
                if (cleanHandle.length > 0) {
                    // Check if handle is taken
                    const existing = await prisma.user.findUnique({ where: { handle: cleanHandle } });
                    if (existing && existing.id !== session.user.id) {
                        return NextResponse.json({ error: "Handle is already taken" }, { status: 409 });
                    }
                    updateData.handle = cleanHandle;
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: { id: true, name: true, email: true, image: true, handle: true, bio: true, status: true },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[API/user/profile] Error:", error);
        return NextResponse.json(
            { error: "Failed to update profile", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
