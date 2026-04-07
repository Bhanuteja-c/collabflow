// src/app/dashboard/page.tsx
// Server-side redirect to user's first workspace (no client-side flash)
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { findUserFirstWorkspace } from "@/lib/queries/dashboard";

export default async function DashboardRedirect() {
    const session = await auth();

    if (!session?.user) {
        redirect("/sign-in");
    }

    const membership = await findUserFirstWorkspace();

    if (membership?.workspace?.slug) {
        redirect(`/workspace/${membership.workspace.slug}`);
    }

    redirect("/workspace/new");
}
