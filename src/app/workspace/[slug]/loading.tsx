// Workspace Dashboard Loading Skeleton
// Layout exactly mirrors the real dashboard to prevent CLS
export default function WorkspaceDashboardLoading() {
    return (
        <div className="min-h-full p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
            {/* Welcome Banner */}
            <div className="h-[120px] md:h-[136px] bg-muted/40 shimmer border border-border/40 rounded-2xl mb-4" />

            {/* Overview Stats — grid-cols-2 lg:grid-cols-4 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[104px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" />
                ))}
            </div>

            {/* Quick Access — grid-cols-2 md:grid-cols-4 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[76px] bg-muted/40 shimmer border border-border/40 rounded-[18px]" />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    {/* My Tasks */}
                    <div className="w-full min-h-[400px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" />
                    {/* Recent Work */}
                    <div className="w-full min-h-[180px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" />
                </div>

                <div className="lg:col-span-4 space-y-5">
                    {/* Activity Feed */}
                    <div className="w-full min-h-[280px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" />
                    {/* Online Team */}
                    <div className="w-full min-h-[200px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" />
                </div>
            </div>
        </div>
    );
}
