// Chat Page Loading Skeleton
export default function ChatLoading() {
    return (
        <div className="flex h-[calc(100vh-64px)] animate-pulse">
            {/* Channel Sidebar */}
            <div className="w-64 border-r bg-card p-4 space-y-4 hidden md:block">
                <div className="h-5 w-20 bg-muted rounded" />
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5">
                        <div className="h-4 w-4 bg-muted rounded shrink-0" />
                        <div className="h-4 bg-muted rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </div>
                ))}
                <div className="h-px bg-border my-3" />
                <div className="h-5 w-28 bg-muted rounded" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5">
                        <div className="h-6 w-6 bg-muted rounded-full shrink-0" />
                        <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                ))}
            </div>

            {/* Message Area */}
            <div className="flex-1 flex flex-col">
                {/* Channel Header */}
                <div className="h-14 border-b flex items-center px-4 gap-3">
                    <div className="h-5 w-5 bg-muted rounded" />
                    <div className="h-5 w-28 bg-muted rounded" />
                    <div className="ml-auto h-4 w-16 bg-muted/60 rounded" />
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 space-y-5 overflow-hidden">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="h-9 w-9 bg-muted rounded-full shrink-0" />
                            <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-20 bg-muted rounded" />
                                    <div className="h-3 w-12 bg-muted/60 rounded" />
                                </div>
                                <div className="h-4 bg-muted/50 rounded" style={{ width: `${30 + Math.random() * 50}%` }} />
                                {i % 3 === 0 && <div className="h-4 bg-muted/50 rounded" style={{ width: `${20 + Math.random() * 30}%` }} />}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="p-4 border-t">
                    <div className="h-12 bg-muted rounded-xl" />
                </div>
            </div>
        </div>
    );
}
