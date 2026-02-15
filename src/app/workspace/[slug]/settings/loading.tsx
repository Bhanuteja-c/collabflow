// loading.tsx for the settings page
export default function SettingsLoading() {
    return (
        <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto animate-pulse">
            {/* Header */}
            <div className="space-y-2">
                <div className="h-8 w-40 bg-muted rounded-lg" />
                <div className="h-4 w-64 bg-muted rounded" />
            </div>

            {/* Settings sections */}
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-6 bg-muted/30 rounded-xl border space-y-4">
                        <div className="h-5 w-32 bg-muted rounded" />
                        <div className="h-10 w-full bg-muted rounded-lg" />
                        <div className="h-10 w-full bg-muted rounded-lg" />
                        <div className="h-9 w-24 bg-muted rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}
