// src/app/api/search/route.ts
// Unified search API — searches documents, cards, channels, and members within a workspace
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;

        // Rate limit
        const rl = checkRateLimit(`search:${userId}`, RATE_LIMITS.search);
        if (!rl.success) {
            return NextResponse.json({ error: "Too many searches" }, { status: 429 });
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q")?.trim();
        const workspaceId = searchParams.get("workspaceId");

        if (!query || query.length < 1) {
            return NextResponse.json({ documents: [], cards: [], channels: [], members: [] });
        }

        // If workspaceId provided, verify membership
        if (workspaceId) {
            const membership = await prisma.workspaceMember.findFirst({
                where: { workspaceId, userId },
            });
            if (!membership) {
                return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });
            }
        }

        // Run all searches in parallel for speed
        const [documents, cards, channels, members] = await Promise.all([
            // Search documents
            prisma.document.findMany({
                where: {
                    title: { contains: query, mode: "insensitive" },
                    ...(workspaceId ? { workspaceId } : { authorId: userId }),
                },
                select: {
                    id: true,
                    title: true,
                    updatedAt: true,
                    workspace: { select: { slug: true } },
                },
                orderBy: { updatedAt: "desc" },
                take: 5,
            }),

            // Search cards (via board -> workspace)
            workspaceId
                ? prisma.card.findMany({
                    where: {
                        column: { board: { workspaceId } },
                        OR: [
                            { title: { contains: query, mode: "insensitive" } },
                            { description: { contains: query, mode: "insensitive" } },
                        ],
                    },
                    select: {
                        id: true,
                        title: true,
                        priority: true,
                        column: {
                            select: {
                                title: true,
                                board: { select: { id: true, title: true } },
                            },
                        },
                    },
                    take: 5,
                })
                : [],

            // Search channels
            prisma.channel.findMany({
                where: {
                    name: { contains: query, mode: "insensitive" },
                    ...(workspaceId ? { workspaceId } : {}),
                    members: { some: { userId } },
                },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    workspace: { select: { slug: true } },
                },
                take: 5,
            }),

            // Search members (within workspace)
            workspaceId
                ? prisma.workspaceMember.findMany({
                    where: {
                        workspaceId,
                        user: {
                            OR: [
                                { name: { contains: query, mode: "insensitive" } },
                                { email: { contains: query, mode: "insensitive" } },
                            ],
                        },
                    },
                    select: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                            },
                        },
                        role: true,
                    },
                    take: 5,
                })
                : [],
        ]);

        return NextResponse.json({
            documents: documents.map((d) => ({
                id: d.id,
                title: d.title,
                updatedAt: d.updatedAt,
                workspaceSlug: d.workspace?.slug,
                type: "document" as const,
            })),
            cards: cards.map((c: any) => ({
                id: c.id,
                title: c.title,
                priority: c.priority,
                columnName: c.column?.title,
                boardName: c.column?.board?.title,
                type: "card" as const,
            })),
            channels: channels.map((c) => ({
                id: c.id,
                name: c.name,
                channelType: c.type,
                workspaceSlug: c.workspace?.slug,
                type: "channel" as const,
            })),
            members: (members as any[]).map((m) => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                image: m.user.image,
                role: m.role,
                type: "member" as const,
            })),
        });
    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json(
            { error: "Search failed" },
            { status: 500 }
        );
    }
}

