// loading.tsx for the members page
export default function MembersLoading() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full">
            {/* ── Minimal Header Skeleton ── */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border/40">
                <div className="space-y-3">
                    <div className="h-8 w-48 bg-muted/40 shimmer rounded-lg" />
                    <div className="h-4 w-64 bg-muted/40 shimmer rounded-md" />
                </div>
                <div className="h-10 w-40 bg-muted/40 shimmer rounded-lg" />
            </div>

            {/* ── Minimal Control Bar Skeleton ── */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 py-2">
                <div className="flex gap-2">
                    <div className="h-8 w-20 bg-muted/40 shimmer rounded-md" />
                    <div className="h-8 w-24 bg-muted/40 shimmer rounded-md" />
                </div>
                <div className="h-9 w-64 bg-muted/40 shimmer rounded-lg" />
            </div>

            {/* ── Minimal Cards Grid Skeleton ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex flex-col p-5 rounded-xl border border-border/40 bg-card/20 shimmer">
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-12 h-12 rounded-full bg-background/50" />
                            <div className="w-6 h-6 rounded-md bg-background/50" />
                        </div>
                        <div className="space-y-2 mb-4">
                            <div className="h-4 w-28 bg-background/50 rounded-md" />
                            <div className="h-3 w-40 bg-background/50 rounded-md" />
                        </div>
                        <div className="pt-3 border-t border-border/30">
                            <div className="h-4 w-20 bg-background/50 rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
