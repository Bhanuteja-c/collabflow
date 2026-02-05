"use client";

import { Wifi, WifiOff, WifiLow } from "lucide-react";

type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

interface ConnectionQualityIndicatorProps {
    quality: ConnectionQuality;
    className?: string;
}

export function ConnectionQualityIndicator({ quality, className = "" }: ConnectionQualityIndicatorProps) {
    const config = {
        excellent: { icon: Wifi, color: "text-emerald-400", label: "Excellent" },
        good: { icon: Wifi, color: "text-green-400", label: "Good" },
        fair: { icon: WifiLow, color: "text-amber-400", label: "Fair" },
        poor: { icon: WifiOff, color: "text-red-400", label: "Poor" },
        unknown: { icon: Wifi, color: "text-neutral-500", label: "Connecting" },
    };

    const { icon: Icon, color, label } = config[quality];

    return (
        <div
            className={`flex items-center gap-1 ${className}`}
            title={`Connection: ${label}`}
        >
            <Icon className={`w-3 h-3 ${color}`} />
        </div>
    );
}
