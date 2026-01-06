// src/components/landing/ProductDemo.tsx
"use client";

import { motion } from "framer-motion";
import { MousePointer2, MessageSquare, LayoutGrid, FileText } from "lucide-react";

export default function ProductDemo() {
    return (
        <section className="relative py-32 px-6 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-surface" aria-hidden="true" />
            <div className="noise absolute inset-0" aria-hidden="true" />

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-3 py-1 mb-4 text-xs font-medium text-accent bg-accent-muted rounded-full">
                        Live Preview
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Real-time collaboration,{" "}
                        <span className="gradient-text">reimagined</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        See your team's changes instantly. No refresh, no conflicts, just flow.
                    </p>
                </motion.div>

                {/* Browser Window */}
                <motion.div
                    initial={{ opacity: 0, y: 48 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative"
                >
                    {/* Glow */}
                    <div
                        aria-hidden="true"
                        className="absolute -inset-8 rounded-3xl opacity-50"
                        style={{
                            background: "radial-gradient(ellipse at center, hsl(221 83% 53% / 0.15) 0%, transparent 70%)",
                        }}
                    />

                    {/* Browser Frame */}
                    <div className="relative rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
                        {/* Browser Header */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-border">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-amber-400" />
                                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="px-4 py-1.5 bg-background rounded-lg text-xs text-muted-foreground font-mono">
                                    collabflow.app/doc/project-roadmap
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex -space-x-2">
                                    {["bg-blue-500", "bg-emerald-500", "bg-violet-500"].map((color, i) => (
                                        <div key={i} className={`w-6 h-6 rounded-full ${color} border-2 border-card flex items-center justify-center text-white text-[10px] font-bold`}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* App Layout */}
                        <div className="flex min-h-[500px]">
                            {/* Sidebar */}
                            <div className="w-56 border-r border-border p-3 bg-surface/50 hidden md:block">
                                <div className="space-y-1">
                                    {[
                                        { icon: FileText, label: "Documents", active: true },
                                        { icon: LayoutGrid, label: "Kanban" },
                                        { icon: MessageSquare, label: "Chat" },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${item.active
                                                    ? "bg-accent text-accent-foreground"
                                                    : "text-muted-foreground hover:bg-surface"
                                                }`}
                                        >
                                            <item.icon className="w-4 h-4" />
                                            {item.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Editor */}
                            <div className="flex-1 p-8">
                                {/* Toolbar */}
                                <div className="flex items-center gap-2 pb-4 border-b border-border mb-6">
                                    {["B", "I", "U", "H1", "H2", "•"].map((btn) => (
                                        <div
                                            key={btn}
                                            className="w-8 h-8 rounded-lg bg-surface hover:bg-surface/80 flex items-center justify-center text-xs font-semibold text-muted-foreground cursor-pointer transition-colors"
                                        >
                                            {btn}
                                        </div>
                                    ))}
                                </div>

                                {/* Document */}
                                <div className="space-y-4 max-w-2xl">
                                    <h1 className="text-2xl font-bold">Q4 Product Roadmap</h1>
                                    <p className="text-muted-foreground">
                                        This quarter we focus on three key initiatives:
                                    </p>
                                    <ul className="space-y-2 text-muted-foreground">
                                        <li className="flex items-start gap-2">
                                            <span className="text-accent">•</span>
                                            Launch collaborative editing features
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-accent">•</span>
                                            Improve real-time synchronization
                                        </li>
                                        <li className="flex items-start gap-2 relative">
                                            <span className="text-accent">•</span>
                                            <span>Add team workspaces</span>
                                            <motion.span
                                                animate={{ opacity: [1, 0, 1] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                                className="inline-block w-0.5 h-5 bg-blue-500 ml-1"
                                            />
                                        </li>
                                    </ul>
                                </div>

                                {/* Animated Cursors */}
                                <motion.div
                                    className="absolute pointer-events-none"
                                    initial={{ x: 280, y: 300 }}
                                    animate={{ x: [280, 420, 350, 280], y: [300, 340, 380, 300] }}
                                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <MousePointer2 className="w-5 h-5 text-blue-500 fill-blue-500 drop-shadow-lg" />
                                    <span className="absolute top-5 left-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium shadow-lg">
                                        Alice
                                    </span>
                                </motion.div>

                                <motion.div
                                    className="absolute pointer-events-none"
                                    initial={{ x: 360, y: 360 }}
                                    animate={{ x: [360, 240, 440, 360], y: [360, 420, 340, 360] }}
                                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <MousePointer2 className="w-5 h-5 text-emerald-500 fill-emerald-500 drop-shadow-lg" />
                                    <span className="absolute top-5 left-1 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full font-medium shadow-lg">
                                        Bob
                                    </span>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Feature Chips */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap justify-center gap-3 mt-10"
                >
                    {[
                        "Real-time cursors",
                        "Live presence",
                        "Instant sync",
                        "Version history",
                        "Offline support",
                    ].map((feature) => (
                        <span
                            key={feature}
                            className="px-4 py-2 rounded-full bg-card border border-border text-sm text-muted-foreground"
                        >
                            {feature}
                        </span>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
