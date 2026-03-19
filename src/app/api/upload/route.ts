// src/app/api/upload/route.ts
// File upload endpoint for chat attachments using Azure Blob Storage
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUser } from "@/lib/ensureUser";
import { BlobServiceClient } from "@azure/storage-blob";
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

        const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!AZURE_STORAGE_CONNECTION_STRING) {
            console.error("AZURE_STORAGE_CONNECTION_STRING is not set.");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        // Generate unique filename
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const filename = `${uuidv4()}.${ext}`;

        // Initialize Azure Blob Client
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient("uploads");
        // Ensure the container exists (auto-create on first upload)
        await containerClient.createIfNotExists({ access: "blob" });

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Azure
        const blockBlobClient = containerClient.getBlockBlobClient(filename);
        await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: { blobContentType: file.type }
        });

        // Determine file type
        const isImage = file.type.startsWith("image/");
        const type = isImage ? "image" : "pdf";

        // Return file info including the public Azure URL
        const attachment = {
            type,
            url: blockBlobClient.url,
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
