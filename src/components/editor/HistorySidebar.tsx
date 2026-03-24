"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, History, RotateCcw, Calendar, User as UserIcon } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface HistoryEntry {
    id: string;
    createdAt: string;
    action: string;
    details: string | null;
    snapshot: string | null;
    user: {
        name: string | null;
        image: string | null;
    };
}

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
    onRestore: (content: string) => Promise<void>;
}

export function HistorySidebar({ isOpen, onClose, documentId, onRestore }: HistorySidebarProps) {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<HistoryEntry | null>(null);
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, documentId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/documents/${documentId}/history`);
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
                // Select most recent by default if available
                if (data.length > 0) setSelectedVersion(data[0]);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
            toast.error("Failed to load history");
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!selectedVersion?.snapshot) return;

        setRestoring(true);
        try {
            await onRestore(selectedVersion.snapshot);
            toast.success("Version restored successfully");
            onClose();
        } catch (error) {
            console.error("Failed to restore:", error);
            toast.error("Failed to restore version");
        } finally {
            setRestoring(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-[90vw] md:max-w-4xl flex flex-col sm:flex-row gap-0 p-0 overflow-hidden">
                {/* Left Panel: History List */}
                <div className="w-full sm:w-80 border-r flex flex-col bg-muted/30">
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <History className="w-5 h-5" />
                            Version History
                        </SheetTitle>
                        <SheetDescription>
                            Select a version to preview and restore.
                        </SheetDescription>
                    </SheetHeader>

                    <ScrollArea className="flex-1">
                        <div className="flex flex-col">
                            {loading ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : history.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No history available.
                                </div>
                            ) : (
                                history.map((entry) => (
                                    <button
                                        key={entry.id}
                                        onClick={() => setSelectedVersion(entry)}
                                        className={`flex flex-col gap-2 p-4 text-left transition-colors border-b last:border-0 hover:bg-muted/50 ${selectedVersion?.id === entry.id ? "bg-accent text-accent-foreground border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-sm font-medium">
                                                {format(new Date(entry.createdAt), "MMM d, h:mm a")}
                                            </span>
                                            <Badge variant="secondary" className="text-[10px] h-5">
                                                {entry.action}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <UserAvatar user={{ name: entry.user?.name, image: entry.user?.image }} className="w-5 h-5" showStatus={false} />
                                            <span className="text-xs text-muted-foreground truncate">
                                                {entry.user.name}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Panel: Preview */}
                <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
                    <div className="p-4 border-b flex items-center justify-between bg-background z-10">
                        <div className="flex flex-col">
                            <span className="font-semibold">Snapshot Preview</span>
                            {selectedVersion && (
                                <span className="text-xs text-muted-foreground">
                                    {format(new Date(selectedVersion.createdAt), "MMMM d, yyyy 'at' h:mm:ss a")}
                                </span>
                            )}
                        </div>
                        <Button
                            onClick={handleRestore}
                            disabled={!selectedVersion?.snapshot || restoring}
                            size="sm"
                        >
                            {restoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                            Restore this version
                        </Button>
                    </div>

                    <ScrollArea className="flex-1 bg-muted/50 p-6">
                        <div className="max-w-[800px] mx-auto min-h-[500px] bg-white shadow-sm border rounded-sm p-12 text-black">
                            {selectedVersion?.snapshot ? (
                                <div
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: selectedVersion.snapshot }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground opacity-50">
                                    <History className="w-12 h-12 mb-4" />
                                    <p>Select a version to preview</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    );
}
