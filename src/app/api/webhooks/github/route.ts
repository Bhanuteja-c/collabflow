// src/app/api/webhooks/github/route.ts
// Handles GitHub webhooks for smart commits (e.g., KAN-123, Fixes #42)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ── Card Reference Patterns ──────────────────────────────────────────
// Matches: "fixes KAN-1", "closes #2", "resolves KAN-3", "refs KAN-4"
const KEYWORD_REF = /(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?|implement[sd]?|refs?)\s+(?:KAN-|#)(\d+)/gi;
// Matches plain KAN-123 references without keyword
const PLAIN_REF = /\bKAN-(\d+)\b/gi;

function extractIssueNumbers(text: string): number[] {
    if (!text) return [];
    const keywordMatches = [...text.matchAll(KEYWORD_REF)].map(m => parseInt(m[1], 10));
    const plainMatches = [...text.matchAll(PLAIN_REF)].map(m => parseInt(m[1], 10));
    // Also match plain #N references
    const hashMatches = [...text.matchAll(/#(\d+)/g)].map(m => parseInt(m[1], 10));
    const all = [...keywordMatches, ...plainMatches, ...hashMatches].filter(n => !isNaN(n));
    return Array.from(new Set(all));
}

// Check if text contains action keywords (fixes/closes/resolves) for a given number
function hasActionKeyword(text: string, issueNum: number): boolean {
    const pattern = new RegExp(
        `(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\\s+(?:KAN-|#)${issueNum}`, "i"
    );
    return pattern.test(text);
}

// ── Timing-safe HMAC verification ────────────────────────────────────
function verifySignature(body: string, signature: string, secret: string): boolean {
    try {
        const hmac = crypto.createHmac("sha256", secret);
        const digest = "sha256=" + hmac.update(body).digest("hex");
        // Both buffers must be the same length for timingSafeEqual
        const sigBuf = Buffer.from(signature);
        const digBuf = Buffer.from(digest);
        if (sigBuf.length !== digBuf.length) return false;
        return crypto.timingSafeEqual(sigBuf, digBuf);
    } catch {
        return false;
    }
}

// ── Find target column by category ───────────────────────────────────
function findTargetColumn(
    columns: { id: string; title: string; category: string | null; order: number }[],
    targetCategory: "in_progress" | "done"
): typeof columns[0] | undefined {
    // First: try exact category match
    let col = columns.find(c => c.category === targetCategory);
    if (col) return col;

    // Fallback: match by common title names
    const titleMap: Record<string, string[]> = {
        in_progress: ["in progress", "in review", "review", "in development", "doing"],
        done: ["done", "completed", "complete", "finished", "closed", "merged"],
    };
    const titles = titleMap[targetCategory] || [];
    col = columns.find(c => titles.includes(c.title.toLowerCase()));
    if (col) return col;

    // Last resort: first or last column by order
    if (targetCategory === "done") return columns[columns.length - 1];
    if (targetCategory === "in_progress" && columns.length > 1) return columns[1];
    return undefined;
}

// ── Main Handler ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text();
        const signature = req.headers.get("x-hub-signature-256");
        const eventType = req.headers.get("x-github-event");

        // Ping event — GitHub sends this when webhook is first configured
        if (eventType === "ping") {
            return NextResponse.json({ message: "pong" });
        }

        if (!signature || !eventType) {
            return NextResponse.json({ error: "Missing GitHub headers" }, { status: 400 });
        }

        const urlOptions = new URL(req.url);
        const workspaceId = urlOptions.searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
        }

        // Fetch integration
        const integration = await prisma.gitHubIntegration.findFirst({
            where: { workspaceId, enabled: true },
            include: { workspace: { include: { members: { take: 1, select: { userId: true } } } } }
        });

        if (!integration) {
            // Return 200 even on not found — don't make GitHub retry
            return NextResponse.json({ message: "Integration not found or disabled" });
        }

        // Timing-safe HMAC verification
        if (!verifySignature(bodyText, signature, integration.webhookSecret)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const payload = JSON.parse(bodyText);
        const repoName = payload.repository?.full_name;

        // Update repo name and last event timestamp
        if (repoName) {
            await prisma.gitHubIntegration.update({
                where: { id: integration.id },
                data: { repoName, lastEventAt: new Date() }
            });
        }

        const adminUserId = integration.workspace.members[0]?.userId;
        if (!adminUserId) {
            return NextResponse.json({ message: "No workspace members" });
        }

        let processedCount = 0;
        const movedCards: string[] = [];

        // ── PUSH EVENT ───────────────────────────────────────────────
        if (eventType === "push") {
            const commits = payload.commits || [];
            for (const commit of commits) {
                const issueNumbers = extractIssueNumbers(commit.message);
                if (issueNumbers.length === 0) continue;

                const cards = await prisma.card.findMany({
                    where: { issueNumber: { in: issueNumbers }, board: { workspaceId } },
                    include: { column: true, board: { include: { columns: { orderBy: { order: "asc" } } } } }
                });

                for (const card of cards) {
                    // Add commit comment
                    await prisma.cardComment.create({
                        data: {
                            content: `**🔗 GitHub Commit:** \`${commit.id.substring(0, 7)}\`\n${commit.message}\n[View on GitHub](${commit.url})`,
                            cardId: card.id,
                            authorId: adminUserId,
                        }
                    });

                    // If commit message has action keyword → try to move card
                    if (hasActionKeyword(commit.message, card.issueNumber!)) {
                        const cols = card.board?.columns || [];
                        const targetCol = findTargetColumn(cols, "done");

                        if (targetCol && card.columnId !== targetCol.id) {
                            const fromColumnTitle = card.column?.title || "Unknown";
                            await prisma.card.update({
                                where: { id: card.id },
                                data: { columnId: targetCol.id, status: "completed" }
                            });

                            // Log Activity
                            await prisma.activity.create({
                                data: {
                                    userId: adminUserId,
                                    workspaceId,
                                    type: "card_moved",
                                    action: `moved card to ${targetCol.title} via GitHub commit`,
                                    entityType: "card",
                                    entityId: card.id,
                                    entityTitle: card.title,
                                    metadata: {
                                        source: "github",
                                        event: "push",
                                        commitSha: commit.id,
                                        fromColumn: fromColumnTitle,
                                        toColumn: targetCol.title,
                                    }
                                }
                            });

                            // Real-time socket push
                            const io = (global as any).io;
                            if (io) {
                                io.to(`board:${card.boardId}`).emit("card-moved", {
                                    cardId: card.id,
                                    fromColumnId: card.columnId,
                                    toColumnId: targetCol.id,
                                    newOrder: 0,
                                    source: "github"
                                });
                            }
                            movedCards.push(card.id);
                        }
                    }
                    processedCount++;
                }
            }
            return NextResponse.json({ success: true, processed: processedCount, moved: movedCards.length, action: "push" });
        }

        // ── PULL REQUEST EVENT ────────────────────────────────────────
        if (eventType === "pull_request") {
            const pr = payload.pull_request;
            const action = payload.action;
            const merged = pr.merged;

            const prText = `${pr.title} \n ${pr.body || ""}`;
            const issueNumbers = extractIssueNumbers(prText);

            if (issueNumbers.length > 0) {
                let targetCategory: "in_progress" | "done" | null = null;
                let eventLabel = "";

                if (action === "opened" || action === "reopened") {
                    targetCategory = "in_progress";
                    eventLabel = "PR Opened";
                } else if (action === "closed" && merged) {
                    targetCategory = "done";
                    eventLabel = "PR Merged";
                } else if (action === "closed" && !merged) {
                    targetCategory = "in_progress";
                    eventLabel = "PR Closed (unmerged)";
                }

                if (targetCategory) {
                    const cards = await prisma.card.findMany({
                        where: { issueNumber: { in: issueNumbers }, board: { workspaceId } },
                        include: { column: true, board: { include: { columns: { orderBy: { order: "asc" } } } } }
                    });

                    for (const card of cards) {
                        const cols = card.board?.columns || [];
                        const targetCol = findTargetColumn(cols, targetCategory);

                        if (targetCol && card.columnId !== targetCol.id) {
                            const fromColumnTitle = card.column?.title || "Unknown";

                            await prisma.$transaction([
                                prisma.cardComment.create({
                                    data: {
                                        content: pr.html_url
                                            ? `**🔄 GitHub ${eventLabel}:** [${pr.title}](${pr.html_url})\nAuto-moved to **${targetCol.title}**.`
                                            : `🔄 GitHub ${eventLabel}: ${pr.title} — Auto-moved to **${targetCol.title}**.`,
                                        cardId: card.id,
                                        authorId: adminUserId,
                                    }
                                }),
                                prisma.card.update({
                                    where: { id: card.id },
                                    data: {
                                        columnId: targetCol.id,
                                        status: targetCategory === "done" ? "completed" : "active"
                                    }
                                }),
                                prisma.activity.create({
                                    data: {
                                        userId: adminUserId,
                                        workspaceId,
                                        type: "card_moved",
                                        action: `moved card to ${targetCol.title} via GitHub ${eventLabel}`,
                                        entityType: "card",
                                        entityId: card.id,
                                        entityTitle: card.title,
                                        metadata: {
                                            source: "github",
                                            event: `pull_request:${action}`,
                                            prNumber: pr.number,
                                            prTitle: pr.title,
                                            prUrl: pr.html_url,
                                            fromColumn: fromColumnTitle,
                                            toColumn: targetCol.title,
                                        }
                                    }
                                })
                            ]);

                            // Real-time socket push
                            const io = (global as any).io;
                            if (io) {
                                io.to(`board:${card.boardId}`).emit("card-moved", {
                                    cardId: card.id,
                                    fromColumnId: card.columnId,
                                    toColumnId: targetCol.id,
                                    newOrder: 0,
                                    source: "github"
                                });
                            }
                            movedCards.push(card.id);
                        }
                        processedCount++;
                    }
                }
            }
            return NextResponse.json({ success: true, processed: processedCount, moved: movedCards.length, action: `pr_${action}` });
        }

        return NextResponse.json({ success: true, message: `Ignored event: ${eventType}` });

    } catch (error) {
        console.error("GitHub Webhook Error:", error);
        // Always return 200 to prevent GitHub from retrying
        return NextResponse.json({ error: "Internal error (logged)" }, { status: 200 });
    }
}
