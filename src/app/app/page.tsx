// src/app/app/page.tsx - Redirect to workspace or create new
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AppRedirect() {
    const session = await auth();

    if (!session?.user) {
        redirect("/sign-in");
    }

    const userId = (session.user as any).id;

    // Find user's first workspace
    const membership = await prisma.workspaceMember.findFirst({
        where: { userId },
        include: { workspace: true },
        orderBy: { joinedAt: "asc" },
    });

    if (membership) {
        redirect(`/workspace/${membership.workspace.slug}`);
    } else {
        redirect("/workspace/new");
    }
}
