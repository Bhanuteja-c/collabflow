// Documents List Loading Skeleton
export default function DocumentsLoading() {
    return (
        <div className="flex-1 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-7 w-40 bg-muted/50 shimmer border border-border/40 rounded-lg" />
                    <div className="h-4 w-56 bg-muted/40 shimmer border border-border/40 rounded" />
                </div>
                <div className="h-10 w-36 bg-muted/50 shimmer border border-border/40 rounded-lg" />
            </div>

            {/* Search + View Toggle */}
            <div className="flex items-center gap-3">
                <div className="h-10 flex-1 max-w-sm bg-muted/50 shimmer border border-border/40 rounded-lg" />
                <div className="h-10 w-20 bg-muted/50 shimmer border border-border/40 rounded-lg" />
            </div>

            {/* Document Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-muted/50 shimmer border border-border/40 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-4 w-32 bg-muted/50 shimmer border border-border/40 rounded" />
                                <div className="h-3 w-24 bg-muted/40 shimmer border border-border/40 rounded" />
                            </div>
                        </div>
                        <div className="h-3 w-full bg-muted/30 shimmer border border-border/40 rounded" />
                        <div className="h-3 w-3/4 bg-muted/30 shimmer border border-border/40 rounded" />
                        <div className="flex items-center justify-between pt-2">
                            <div className="h-6 w-6 bg-muted/50 shimmer border border-border/40 rounded-full" />
                            <div className="h-3 w-16 bg-muted/40 shimmer border border-border/40 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
