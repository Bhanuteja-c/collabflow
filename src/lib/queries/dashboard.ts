// src/lib/queries/dashboard.ts
// Query extracts userId internally to avoid Turbopack parameterizing function arguments
// (Prisma 7.x + Next.js 16 Turbopack known bug)
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function findUserFirstWorkspace() {
    const session = await auth();
    if (!session?.user) return null;

    const uid = (session.user as { id: string }).id;
    return prisma.workspaceMember.findFirst({
        where: { userId: uid },
        include: { workspace: { select: { slug: true } } },
        orderBy: { joinedAt: "desc" },
    });
}
