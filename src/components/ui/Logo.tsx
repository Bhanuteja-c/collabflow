// src/components/ui/Logo.tsx
"use client";

import { useTheme } from "next-themes";

interface LogoProps {
    className?: string;
    showText?: boolean;
    size?: "sm" | "md" | "lg";
}

const sizeMap = {
    sm: { icon: 28, text: "text-lg", gap: "gap-2" },
    md: { icon: 36, text: "text-xl", gap: "gap-2.5" },
    lg: { icon: 48, text: "text-2xl", gap: "gap-3" },
};

export default function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const { icon, text, gap } = sizeMap[size];

    return (
        <div className={`flex items-center ${gap} ${className}`}>
            {/* Logo Icon - Modern "CF" monogram with flow element */}
            <svg
                width={icon}
                height={icon}
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
            >
                <defs>
                    {/* Main gradient */}
                    <linearGradient id="logoGradientPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="50%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background rounded square */}
                <rect
                    x="4"
                    y="4"
                    width="40"
                    height="40"
                    rx="12"
                    fill="url(#logoGradientPrimary)"
                />

                {/* Subtle inner highlight */}
                <rect
                    x="6"
                    y="6"
                    width="36"
                    height="36"
                    rx="10"
                    fill="none"
                    stroke="white"
                    strokeWidth="1"
                    opacity="0.2"
                />

                {/* Flow symbol - stylized arrow/wave representing collaboration flow */}
                <path
                    d="M14 28L20 22L26 28L32 22"
                    stroke="white"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#logoGlow)"
                />

                {/* Secondary element - representing multiple users/data points */}
                <circle cx="14" cy="18" r="3" fill="white" opacity="0.9" />
                <circle cx="24" cy="18" r="3" fill="white" opacity="0.7" />
                <circle cx="34" cy="18" r="3" fill="white" opacity="0.9" />
            </svg>

            {/* Logo Text */}
            {showText && (
                <span className={`font-bold tracking-tight ${text}`}>
                    <span className={isDark ? "text-white" : "text-gray-900"}>Collab</span>
                    <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                        Flow
                    </span>
                </span>
            )}
        </div>
    );
}

export { Logo };
