// src/app/dashboard/page.tsx
// Server-side redirect to user's first workspace (no client-side flash)
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardRedirect() {
    const session = await auth();

    if (!session?.user) {
        redirect("/sign-in");
    }

    const userId = (session.user as { id: string }).id;

    // Find user's first workspace
    const membership = await prisma.workspaceMember.findFirst({
        where: { userId },
        include: { workspace: { select: { slug: true } } },
        orderBy: { joinedAt: "desc" },
    });

    if (membership?.workspace?.slug) {
        redirect(`/workspace/${membership.workspace.slug}`);
    }

    redirect("/workspace/new");
}
