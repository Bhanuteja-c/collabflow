"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Global Error]", error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen flex items-center justify-center p-8 bg-background">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Something went wrong</h1>
                            <p className="text-muted-foreground">
                                An unexpected error occurred. Please try again.
                            </p>
                            {error.digest && (
                                <p className="text-xs font-mono text-muted-foreground/60">
                                    Error ID: {error.digest}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            <Button onClick={reset} size="sm">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/dashboard">
                                    <Home className="w-4 h-4 mr-2" />
                                    Home
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
