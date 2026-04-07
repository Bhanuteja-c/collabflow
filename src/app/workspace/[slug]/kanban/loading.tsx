// Kanban Board Loading Skeleton
export default function KanbanLoading() {
    return (
        <div className="flex-1 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-7 w-36 bg-muted/50 shimmer border border-border/40 rounded-lg" />
                    <div className="h-4 w-48 bg-muted/40 shimmer border border-border/40 rounded" />
                </div>
                <div className="flex gap-2">
                    <div className="h-9 w-24 bg-muted/50 shimmer border border-border/40 rounded-lg" />
                    <div className="h-9 w-9 bg-muted/50 shimmer border border-border/40 rounded-lg" />
                </div>
            </div>

            {/* Columns */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {["To Do", "In Progress", "Review", "Done"].map((title, colIdx) => (
                    <div key={colIdx} className="w-72 shrink-0 rounded-xl border bg-card">
                        {/* Column Header */}
                        <div className="p-4 flex items-center justify-between border-b">
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-20 bg-muted/50 shimmer border border-border/40 rounded" />
                                <div className="h-5 w-5 bg-muted/40 shimmer border border-border/40 rounded-full text-xs" />
                            </div>
                            <div className="h-6 w-6 bg-muted/50 shimmer border border-border/40 rounded" />
                        </div>

                        {/* Cards */}
                        <div className="p-3 space-y-3">
                            {Array.from({ length: 2 + colIdx % 3 }).map((_, cardIdx) => (
                                <div key={cardIdx} className="rounded-lg border bg-background p-3.5 space-y-2.5">
                                    <div className="h-4 w-full bg-muted/50 shimmer border border-border/40 rounded" />
                                    <div className="h-3 w-3/4 bg-muted/40 shimmer border border-border/40 rounded" />
                                    <div className="flex items-center justify-between pt-1">
                                        <div className="h-5 w-14 bg-muted/40 shimmer border border-border/40 rounded-full" />
                                        <div className="h-6 w-6 bg-muted/50 shimmer border border-border/40 rounded-full" />
                                    </div>
                                </div>
                            ))}

                            {/* Add card button */}
                            <div className="h-9 w-full bg-muted/30 shimmer border border-border/40 rounded-lg border border-dashed border-muted" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
