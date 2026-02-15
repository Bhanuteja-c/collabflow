// loading.tsx for the members page
export default function MembersLoading() {
    return (
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-40 bg-muted rounded-lg" />
                    <div className="h-4 w-64 bg-muted rounded" />
                </div>
                <div className="h-9 w-36 bg-muted rounded-lg" />
            </div>

            {/* Member list */}
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border">
                        <div className="w-10 h-10 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-32 bg-muted rounded" />
                            <div className="h-3 w-48 bg-muted rounded" />
                        </div>
                        <div className="h-8 w-20 bg-muted rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
