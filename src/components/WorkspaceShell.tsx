"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { WorkspaceSidebar, MobileSidebar } from "@/components/WorkspaceSidebar";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { SocketProvider } from "@/components/providers/SocketProvider";

interface WorkspaceShellProps {
    workspaceSlug: string;
    children: React.ReactNode;
}

export function WorkspaceShell({ workspaceSlug, children }: WorkspaceShellProps) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname() || "";
    const base = `/workspace/${workspaceSlug}`;

    // Detect if we're in an active video room (not the video listing page)
    // Precise string splitting is much safer than regex across different operating system path styles / URL formations
    const segments = pathname.split('/').filter(Boolean);
    const isVideoRoom = segments.includes('video') && segments.length >= 4 && segments[segments.length - 1] !== 'video';

    // Global workspace keyboard shortcuts
    useKeyboardShortcuts([
        { key: "1", ctrl: true, description: "Go to Dashboard", category: "Navigation", action: () => router.push(base) },
        { key: "2", ctrl: true, description: "Go to Documents", category: "Navigation", action: () => router.push(`${base}/documents`) },
        { key: "3", ctrl: true, description: "Go to Kanban", category: "Navigation", action: () => router.push(`${base}/kanban`) },
        { key: "4", ctrl: true, description: "Go to Chat", category: "Navigation", action: () => router.push(`${base}/chat`) },
        { key: "5", ctrl: true, description: "Go to Video", category: "Navigation", action: () => router.push(`${base}/video`) },
    ]);

    // Video rooms render fullscreen — no sidebar, no header
    if (isVideoRoom) {
        return (
            <SocketProvider>
                <div className="h-screen w-screen bg-[#202124] overflow-hidden">
                    {children}
                </div>
            </SocketProvider>
        );
    }

    return (
        <SocketProvider>
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
                    <WorkspaceHeader
                        onMenuClick={() => setIsMobileSidebarOpen(true)}
                        workspaceSlug={workspaceSlug}
                    />
                    <div className="flex-1 overflow-auto">
                        {children}
                    </div>
                </main>

                {/* Keyboard shortcuts help (Shift+?) */}
                <KeyboardShortcutsDialog />
            </div>
        </SocketProvider>
    );
}
