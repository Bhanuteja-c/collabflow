// src/app/api/upload/route.ts
// File upload endpoint for chat attachments
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUser } from "@/lib/ensureUser";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Allowed file types
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await ensureUser(session.user as { id: string; name?: string; email?: string; image?: string });

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Allowed: images (jpeg, png, gif, webp) and PDF" },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 5MB" },
                { status: 400 }
            );
        }

        // Generate unique filename
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const filename = `${uuidv4()}.${ext}`;

        // Ensure uploads directory exists
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filepath = path.join(uploadsDir, filename);
        await writeFile(filepath, buffer);

        // Determine file type
        const isImage = file.type.startsWith("image/");
        const type = isImage ? "image" : "pdf";

        // Return file info
        const attachment = {
            type,
            url: `/uploads/${filename}`,
            name: file.name,
            size: file.size,
            mimeType: file.type,
        };

        return NextResponse.json(attachment);
    } catch (error) {
        console.error("[API/upload] Error:", error);
        return NextResponse.json(
            { error: "Upload failed", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
