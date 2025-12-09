// src/app/(dashboard)/editor/page.tsx — Fixed SSR Editor
"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import the editor with SSR disabled
const EditorComponent = dynamic(
    () => import("@/components/SimpleEditor"),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                        Loading editor...
                    </p>
                </div>
            </div>
        ),
    }
);

export default function EditorPage() {
    return <EditorComponent />;
}
