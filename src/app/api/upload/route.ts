// src/app/api/upload/route.ts
// File upload endpoint for chat attachments using Azure Blob Storage
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUser } from "@/lib/ensureUser";
import { prisma } from "@/lib/prisma";
import { BlobServiceClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

// Allowed file types — expanded for file manager
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "text/markdown",
    "application/zip",
    "application/x-tar",
    "application/gzip",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function getFileCategory(mimeType: string): "IMAGE" | "DOCUMENT" | "VIDEO" | "AUDIO" | "ARCHIVE" | "OTHER" {
    if (mimeType.startsWith("image/")) return "IMAGE";
    if (mimeType.startsWith("video/")) return "VIDEO";
    if (mimeType.startsWith("audio/")) return "AUDIO";
    if (
        mimeType.includes("pdf") ||
        mimeType.includes("word") ||
        mimeType.includes("document") ||
        mimeType.includes("text") ||
        mimeType.includes("sheet") ||
        mimeType.includes("presentation") ||
        mimeType.includes("csv") ||
        mimeType.includes("markdown")
    ) return "DOCUMENT";
    if (
        mimeType.includes("zip") ||
        mimeType.includes("tar") ||
        mimeType.includes("gzip") ||
        mimeType.includes("rar")
    ) return "ARCHIVE";
    return "OTHER";
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        await ensureUser(session.user as { id: string; name?: string; email?: string; image?: string });

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        // Optional metadata for file tracking
        const workspaceId = formData.get("workspaceId") as string | null;
        const sourceType = (formData.get("sourceType") as string | null) || "CHAT";
        const sourceId = formData.get("sourceId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Invalid file type: ${file.type}. Check allowed types.` },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 25MB" },
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

        const blobUrl = blockBlobClient.url;

        // Track file in database if workspaceId is provided
        if (workspaceId) {
            console.log("[Upload] Tracking file:", filename, "workspace:", workspaceId, "source:", sourceType);
            try {
                await prisma.file.create({
                    data: {
                        name: filename,
                        originalName: file.name,
                        url: blobUrl,
                        size: file.size,
                        mimeType: file.type,
                        category: getFileCategory(file.type),
                        workspaceId,
                        uploadedById: userId,
                        sourceType: sourceType as any,
                        sourceId: sourceId ?? null,
                    },
                });
                console.log("[Upload] File tracked:", filename);
            } catch (dbErr) {
                // Log but don't fail the upload — file is already in blob storage
                console.error("[Upload] File tracking failed:", dbErr);
            }
        } else {
            console.warn("[Upload] Skipping file tracking — no workspaceId provided");
        }

        // Determine file type for response
        const isImage = file.type.startsWith("image/");
        const type = isImage ? "image" : file.type.includes("pdf") ? "pdf" : "file";

        // Return file info including the public Azure URL
        const attachment = {
            type,
            url: blobUrl,
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
