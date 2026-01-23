"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// Redirect /dashboard to user's first workspace or create new
export default function DashboardRedirect() {
    const router = useRouter();
    const { status } = useSession();

    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated") {
            router.replace("/sign-in");
            return;
        }

        // Fetch user's workspaces and redirect
        fetch("/api/workspaces")
            .then((res) => res.json())
            .then((workspaces) => {
                if (workspaces && workspaces.length > 0) {
                    // Redirect to first workspace
                    router.replace(`/workspace/${workspaces[0].slug}`);
                } else {
                    // No workspaces, create one
                    router.replace("/workspace/new");
                }
            })
            .catch(() => {
                router.replace("/workspace/new");
            });
    }, [status, router]);

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="animate-pulse text-center">
                <div className="h-8 w-8 mx-auto mb-4 rounded-full bg-primary/20" />
                <p className="text-muted-foreground">Loading your workspace...</p>
            </div>
        </div>
    );
}
