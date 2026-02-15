// Workspace Dashboard Loading Skeleton
export default function WorkspaceDashboardLoading() {
    return (
        <div className="flex-1 p-6 space-y-8 animate-pulse">
            {/* Header skeleton */}
            <div className="space-y-2">
                <div className="h-8 w-72 bg-muted rounded-lg" />
                <div className="h-4 w-48 bg-muted/60 rounded" />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="h-4 w-20 bg-muted rounded" />
                            <div className="h-8 w-8 bg-muted rounded-lg" />
                        </div>
                        <div className="h-8 w-16 bg-muted rounded-lg" />
                        <div className="h-3 w-24 bg-muted/60 rounded" />
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
                        <div className="h-10 w-10 bg-muted rounded-lg" />
                        <div className="h-4 w-20 bg-muted rounded" />
                        <div className="h-3 w-28 bg-muted/60 rounded" />
                    </div>
                ))}
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Documents */}
                <div className="rounded-xl border bg-card p-6 space-y-4">
                    <div className="h-5 w-36 bg-muted rounded" />
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-2">
                            <div className="h-9 w-9 bg-muted rounded-lg shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-4 w-40 bg-muted rounded" />
                                <div className="h-3 w-24 bg-muted/60 rounded" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Activity Feed */}
                <div className="rounded-xl border bg-card p-6 space-y-4">
                    <div className="h-5 w-28 bg-muted rounded" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3 py-2">
                            <div className="h-8 w-8 bg-muted rounded-full shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3.5 w-52 bg-muted rounded" />
                                <div className="h-3 w-20 bg-muted/60 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
