// Workspace Dashboard Loading Skeleton
// Layout exactly mirrors the real dashboard to prevent CLS
export default function WorkspaceDashboardLoading() {
    return (
        <div className="min-h-full p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
            {/* Welcome Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div className="space-y-2">
                    <div className="h-7 w-52 bg-muted/40 shimmer rounded-md" />
                    <div className="h-4 w-64 bg-muted/30 shimmer rounded" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-8 w-20 bg-muted/40 shimmer rounded-lg" />
                    <div className="h-8 w-8 bg-muted/40 shimmer rounded-lg" />
                    <div className="h-8 w-24 bg-muted/40 shimmer rounded-lg" />
                </div>
            </div>

            {/* Overview Stats — grid-cols-2 lg:grid-cols-4 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[104px] border border-border/40 rounded-[20px] bg-card/60 backdrop-blur-md p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="h-3.5 w-20 bg-muted/50 shimmer rounded" />
                            <div className="w-8 h-8 bg-muted/40 shimmer rounded-lg" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="h-6 w-16 bg-muted/50 shimmer rounded" />
                            <div className="h-2.5 w-28 bg-muted/30 shimmer rounded" />
                        </div>
                    </div>
                ))}
            </div>


            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    {/* My Tasks */}
                    <div className="rounded-[20px] border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-muted/50 shimmer rounded-lg" />
                                <div className="h-4 w-20 bg-muted/50 shimmer rounded" />
                            </div>
                            <div className="h-7 w-16 bg-muted/40 shimmer rounded-lg" />
                        </div>
                        {/* Filter tabs */}
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-muted/10">
                            <div className="h-6 w-12 bg-muted/40 shimmer rounded-md" />
                            <div className="h-6 w-16 bg-muted/30 shimmer rounded-md" />
                            <div className="h-6 w-20 bg-muted/30 shimmer rounded-md" />
                        </div>
                        {/* Task rows */}
                        <div className="p-2 space-y-1.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3.5 px-3 py-2.5 rounded-[12px] bg-background/40">
                                    <div className="w-1.5 h-6 rounded-full bg-muted/50 shimmer flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3.5 bg-muted/50 shimmer rounded" style={{ width: `${65 - i * 8}%` }} />
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-16 bg-muted/30 shimmer rounded-md" />
                                            <div className="h-3 w-14 bg-muted/30 shimmer rounded-md" />
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-muted/30 shimmer flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Work */}
                    <div className="rounded-[20px] border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-muted/50 shimmer rounded-lg" />
                                <div className="h-4 w-24 bg-muted/50 shimmer rounded" />
                            </div>
                        </div>
                        <div className="p-3 space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                                    <div className="w-8 h-8 bg-muted/40 shimmer rounded-lg flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3.5 bg-muted/50 shimmer rounded" style={{ width: `${70 - i * 12}%` }} />
                                        <div className="h-2.5 w-20 bg-muted/30 shimmer rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-5">
                    {/* Activity Feed */}
                    <div className="rounded-[20px] border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-muted/50 shimmer rounded-lg" />
                                <div className="h-4 w-28 bg-muted/50 shimmer rounded" />
                            </div>
                        </div>
                        <div className="p-3 space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-start gap-2.5 px-2 py-1.5">
                                    <div className="w-7 h-7 rounded-full bg-muted/40 shimmer flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-muted/50 shimmer rounded" style={{ width: `${85 - i * 10}%` }} />
                                        <div className="h-2.5 w-16 bg-muted/30 shimmer rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Online Team */}
                    <div className="rounded-[20px] border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-muted/50 shimmer rounded-lg" />
                                <div className="h-4 w-20 bg-muted/50 shimmer rounded" />
                            </div>
                            <div className="h-5 w-5 bg-muted/40 shimmer rounded-full" />
                        </div>
                        <div className="p-3 space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                                    <div className="w-8 h-8 rounded-full bg-muted/40 shimmer flex-shrink-0" />
                                    <div className="flex-1 space-y-1">
                                        <div className="h-3 w-24 bg-muted/50 shimmer rounded" />
                                        <div className="h-2.5 w-14 bg-muted/30 shimmer rounded" />
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-muted/40 shimmer" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
