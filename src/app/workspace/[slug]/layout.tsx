import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkspaceShell } from "@/components/WorkspaceShell";

interface WorkspaceLayoutProps {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}

export default async function WorkspaceLayout({
    children,
    params,
}: WorkspaceLayoutProps) {
    const session = await auth();
    if (!session?.user) {
        redirect("/sign-in");
    }

    const { slug } = await params;
    const userId = (session.user as any).id;

    // Check workspace exists and user has access
    const workspace = await prisma.workspace.findUnique({
        where: { slug },
        include: {
            members: {
                where: { userId },
            },
        },
    });

    if (!workspace || workspace.members.length === 0) {
        redirect("/workspace/new");
    }

    return (
        <WorkspaceShell workspaceSlug={slug}>
            {children}
        </WorkspaceShell>
    );
}
