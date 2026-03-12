// src/app/api/webhooks/github/route.ts
// Handles GitHub webhooks for smart commits (e.g., KAN-123)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text();
        const signature = req.headers.get("x-hub-signature-256");
        const eventType = req.headers.get("x-github-event");

        if (!signature || !eventType) {
            return NextResponse.json({ error: "Missing GitHub headers" }, { status: 400 });
        }

        const urlOptions = new URL(req.url);
        const workspaceId = urlOptions.searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "Missing workspaceId in query" }, { status: 400 });
        }

        const integration = await prisma.gitHubIntegration.findFirst({
            where: { workspaceId, enabled: true },
            include: { workspace: { include: { members: { take: 1, select: { userId: true } } } } }
        });

        if (!integration) {
            return NextResponse.json({ error: "Integration not found or disabled" }, { status: 404 });
        }

        // Verify HMAC
        const hmac = crypto.createHmac("sha256", integration.webhookSecret);
        const digest = "sha256=" + hmac.update(bodyText).digest("hex");
        if (signature !== digest) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const payload = JSON.parse(bodyText);
        const repoName = payload.repository?.full_name;
        
        if (repoName) {
            await prisma.gitHubIntegration.update({
                where: { id: integration.id },
                data: { repoName, lastEventAt: new Date() }
            });
        }

        const adminUserId = integration.workspace.members[0]?.userId;
        if (!adminUserId) {
            return NextResponse.json({ message: "No members found in workspace" }, { status: 200 });
        }

        const extractIssueNumbers = (text: string): number[] => {
            if (!text) return [];
            const matches1 = [...text.matchAll(/#(\d+)/g)];
            const matches2 = [...text.matchAll(/[A-Z]+-(\d+)/g)];
            const nums = [...matches1, ...matches2].map(m => parseInt(m[1], 10)).filter(n => !isNaN(n));
            return Array.from(new Set(nums));
        };

        let processedCount = 0;

        // --- PUSH EVENT ---
        if (eventType === "push") {
            const commits = payload.commits || [];
            for (const commit of commits) {
                const issueNumbers = extractIssueNumbers(commit.message);
                if (issueNumbers.length === 0) continue;

                const cards = await prisma.card.findMany({
                    where: { issueNumber: { in: issueNumbers }, board: { workspaceId } }
                });

                for (const card of cards) {
                    await prisma.cardComment.create({
                        data: {
                            content: `**🔗 GitHub Commit:** \`${commit.id.substring(0, 7)}\`\n${commit.message}\n[View on GitHub](${commit.url})`,
                            cardId: card.id,
                            authorId: adminUserId,
                        }
                    });
                    processedCount++;
                }
            }
            return NextResponse.json({ success: true, processed: processedCount, action: "push" });
        }

        // --- PULL REQUEST EVENT ---
        if (eventType === "pull_request") {
            const pr = payload.pull_request;
            const action = payload.action; // opened, closed, reopened
            const merged = pr.merged;

            const issueNumbers = extractIssueNumbers(`${pr.title} \n ${pr.body || ""}`);
            
            if (issueNumbers.length > 0) {
                let cardAction: "in_review" | "done" | null = null;
                if (action === "opened" || action === "reopened") cardAction = "in_review";
                else if (action === "closed" && merged) cardAction = "done";

                if (cardAction) {
                    const cards = await prisma.card.findMany({
                        where: { issueNumber: { in: issueNumbers }, board: { workspaceId } },
                        include: { board: { include: { columns: { orderBy: { order: "asc" } } } } }
                    });

                    for (const card of cards) {
                        const cols = card.board?.columns || [];
                        let targetCol = cols.find(c => c.category === (cardAction === "done" ? "done" : "in_progress"));
                        if (!targetCol && cols.length > 0) {
                            targetCol = cardAction === "done" ? cols[cols.length - 1] : cols[Math.min(1, cols.length - 1)];
                        }

                        if (targetCol && card.columnId !== targetCol.id) {
                            await prisma.$transaction([
                                prisma.cardComment.create({
                                    data: {
                                        content: `**🔄 GitHub PR ${merged ? 'Merged' : 'Opened'}:** [${pr.title}](${pr.html_url})\nAuto-moved to **${targetCol.title}**.`,
                                        cardId: card.id,
                                        authorId: adminUserId,
                                    }
                                }),
                                prisma.card.update({
                                    where: { id: card.id },
                                    data: {
                                        columnId: targetCol.id,
                                        status: cardAction === "done" ? "completed" : "active"
                                    }
                                })
                            ]);
                            processedCount++;
                        }
                    }
                }
            }
            return NextResponse.json({ success: true, processed: processedCount, action: `pr_${action}` });
        }

        return NextResponse.json({ success: true, message: `Ignored event: ${eventType}` });

    } catch (error) {
        console.error("GitHub Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
