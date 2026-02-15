"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function WorkspaceError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Workspace Error]", error);
    }, [error]);

    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Something went wrong</h2>
                    <p className="text-muted-foreground text-sm">
                        We encountered an unexpected error loading this page.
                        {error.digest && (
                            <span className="block mt-1 text-xs font-mono text-muted-foreground/60">
                                Error ID: {error.digest}
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                    <Button onClick={reset} variant="default" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard">
                            <Home className="w-4 h-4 mr-2" />
                            Dashboard
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
