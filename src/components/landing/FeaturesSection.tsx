// src/components/landing/FeaturesSection.tsx
"use client";

import { motion } from "framer-motion";
import {
    FileText,
    Users,
    Zap,
    Lock,
    MessageSquare,
    LayoutGrid,
    Globe,
    Palette,
} from "lucide-react";

const features = [
    {
        icon: FileText,
        title: "Rich Document Editor",
        description: "Full-featured editor with formatting, tables, embeds, and real-time collaboration.",
        gradient: "from-blue-500 to-cyan-500",
        size: "large",
    },
    {
        icon: Users,
        title: "Live Presence",
        description: "See who's viewing and editing in real-time with live cursors.",
        gradient: "from-violet-500 to-purple-500",
        size: "small",
    },
    {
        icon: MessageSquare,
        title: "Team Chat",
        description: "Built-in messaging without switching apps.",
        gradient: "from-pink-500 to-rose-500",
        size: "small",
    },
    {
        icon: LayoutGrid,
        title: "Kanban Boards",
        description: "Visual project management with drag-and-drop simplicity. Track progress effortlessly.",
        gradient: "from-amber-500 to-orange-500",
        size: "large",
    },
    {
        icon: Zap,
        title: "Instant Sync",
        description: "Changes sync in milliseconds, not seconds.",
        gradient: "from-emerald-500 to-green-500",
        size: "small",
    },
    {
        icon: Lock,
        title: "Enterprise Security",
        description: "End-to-end encryption and SSO ready.",
        gradient: "from-slate-500 to-zinc-500",
        size: "small",
    },
    {
        icon: Globe,
        title: "Works Everywhere",
        description: "Desktop, tablet, or phone—your workspace is always with you.",
        gradient: "from-indigo-500 to-blue-500",
        size: "small",
    },
    {
        icon: Palette,
        title: "Beautiful by Default",
        description: "Dark and light modes that look stunning.",
        gradient: "from-fuchsia-500 to-pink-500",
        size: "small",
    },
];

export default function FeaturesSection() {
    return (
        <section id="features" className="relative py-32 px-6 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-background" aria-hidden="true" />
            <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" aria-hidden="true" />

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-3 py-1 mb-4 text-xs font-medium text-accent bg-accent-muted rounded-full">
                        Features
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Everything you need to{" "}
                        <span className="gradient-text">ship faster</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Built for teams who value simplicity and productivity. No bloat, just the essentials done right.
                    </p>
                </motion.div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            className={`group relative p-6 rounded-2xl border border-border bg-card hover:bg-surface-elevated transition-all duration-300 card-hover ${feature.size === "large" ? "lg:col-span-2" : ""
                                }`}
                        >
                            {/* Gradient Background on Hover */}
                            <div
                                aria-hidden="true"
                                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`}
                            />

                            {/* Icon */}
                            <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>

                            {/* Content */}
                            <h3 className="relative text-lg font-semibold mb-2">{feature.title}</h3>
                            <p className="relative text-sm text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
