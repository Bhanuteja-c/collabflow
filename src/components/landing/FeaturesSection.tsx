// src/components/landing/FeaturesSection.tsx
"use client";

import { useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import {
    FileText,
    Users,
    Zap,
    MessageSquare,
    LayoutGrid,
    Globe,
    Video,
    PenTool,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";

const features = [
    {
        icon: FileText,
        title: "Rich Document Editor",
        description: "Full-featured editor with formatting, tables, embeds, and real-time collaboration powered by TipTap.",
        gradient: "from-blue-500 to-cyan-500",
        size: "large",
    },
    {
        icon: Users,
        title: "Live Presence",
        description: "See who's viewing and editing in real-time with live cursors and status indicators.",
        gradient: "from-violet-500 to-purple-500",
        size: "small",
    },
    {
        icon: MessageSquare,
        title: "Team Chat",
        description: "Built-in channels, DMs, mentions, and file sharing without switching apps.",
        gradient: "from-pink-500 to-rose-500",
        size: "small",
    },
    {
        icon: LayoutGrid,
        title: "Kanban Boards",
        description: "Visual project management with drag-and-drop, epics, assignees, and story points. Track progress effortlessly.",
        gradient: "from-amber-500 to-orange-500",
        size: "large",
    },
    {
        icon: Video,
        title: "Video Huddles",
        description: "Jump into video calls instantly from any workspace. No downloads needed.",
        gradient: "from-emerald-500 to-teal-500",
        size: "small",
        isNew: true,
    },
    {
        icon: PenTool,
        title: "Whiteboard",
        description: "Brainstorm visually with an infinite canvas. Draw, sketch, and diagram together.",
        gradient: "from-fuchsia-500 to-pink-500",
        size: "small",
        isNew: true,
    },
    {
        icon: Globe,
        title: "Works Everywhere",
        description: "Fully responsive — desktop, tablet, or phone. Your workspace is always with you.",
        gradient: "from-indigo-500 to-blue-500",
        size: "small",
    },
    {
        icon: Zap,
        title: "Instant Sync",
        description: "Changes sync in milliseconds via WebSockets. No polling, no delays.",
        gradient: "from-yellow-500 to-amber-500",
        size: "small",
    },
];

function FeatureCard({ feature, delay }: { feature: typeof features[0]; delay: number }) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const [isHovered, setIsHovered] = useState(false);
    
    // Check if we are in dark mode for the spotlight color
    const [isDark, setIsDark] = useState(true);
    const { theme } = useTheme();
    useEffect(() => {
        setIsDark(theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches));
    }, [theme]);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5, ease: "easeOut" }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`group relative p-6 sm:p-8 rounded-3xl border border-black/5 dark:border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-md overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 ${feature.size === "large" ? "lg:col-span-2" : ""}`}
        >
            {/* Spotlight Effect */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                            600px circle at ${mouseX}px ${mouseY}px,
                            ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'},
                            transparent 40%
                        )
                    `,
                }}
            />

            {/* Gradient border glow on hover */}
            <div
                aria-hidden="true"
                className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 -z-10`}
            />

            {/* Top right gradient blob */}
            <div
                className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${feature.gradient} rounded-full blur-[80px] opacity-[0.15] dark:opacity-20 group-hover:opacity-30 dark:group-hover:opacity-40 transition-opacity duration-500`}
            />

            {/* New Badge */}
            {"isNew" in feature && feature.isNew && (
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-accent/10 border border-accent/20 text-accent rounded-full">
                        New
                    </span>
                </div>
            )}

            {/* Icon */}
            <div className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(var(--accent),0.2)] transition-all duration-300`}>
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>

            {/* Content */}
            <h3 className="relative text-lg sm:text-xl font-bold mb-2 sm:mb-3 group-hover:text-foreground transition-colors tracking-tight text-foreground/90">{feature.title}</h3>
            <p className="relative text-sm text-muted-foreground leading-relaxed">
                {feature.description}
            </p>
        </motion.div>
    );
}

export default function FeaturesSection() {
    return (
        <section id="features" className="relative py-32 px-6 overflow-hidden border-y border-border/50 bg-background/50">
            {/* Background */}
            <div className="bg-dots absolute inset-0 opacity-10 dark:opacity-20" aria-hidden="true" />
            
            {/* Ambient gradients */}
            <div className="absolute top-1/2 left-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2" />
            <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px] -translate-y-1/2" />

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-accent bg-accent/10 border border-accent/20 rounded-full">
                        Features
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                        Everything you need to{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400">ship faster</span>
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Built for teams who value simplicity and productivity. No bloat, just the essentials done right.
                    </p>
                </motion.div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, i) => (
                        <FeatureCard key={feature.title} feature={feature} delay={i * 0.1} />
                    ))}
                </div>
            </div>
        </section>
    );
}
