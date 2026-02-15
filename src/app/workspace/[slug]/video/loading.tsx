// loading.tsx for the video page
export default function VideoLoading() {
    return (
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-muted rounded-lg" />
                    <div className="h-4 w-56 bg-muted rounded" />
                </div>
                <div className="h-9 w-36 bg-muted rounded-lg" />
            </div>

            {/* Room grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-48 bg-muted rounded-xl border" />
                ))}
            </div>
        </div>
    );
}
