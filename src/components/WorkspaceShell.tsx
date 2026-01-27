"use client";

import { useState } from "react";
import { WorkspaceSidebar, MobileSidebar } from "@/components/WorkspaceSidebar";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

interface WorkspaceShellProps {
    workspaceSlug: string;
    children: React.ReactNode;
}

export function WorkspaceShell({ workspaceSlug, children }: WorkspaceShellProps) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-background">
            {/* Desktop Sidebar */}
            <WorkspaceSidebar workspaceSlug={workspaceSlug} />

            {/* Mobile Sidebar */}
            <MobileSidebar
                workspaceSlug={workspaceSlug}
                isOpen={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                <WorkspaceHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
