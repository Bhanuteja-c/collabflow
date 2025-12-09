// src/components/landing/ProductDemo.tsx
"use client";

import { motion } from "framer-motion";
import { MousePointer2, Sparkles, Users } from "lucide-react";

export default function ProductDemo() {
    return (
        <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                        See it in action
                    </p>
                    <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        Real-time collaboration, reimagined
                    </h2>
                </motion.div>

                {/* Demo Window */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="relative"
                >
                    {/* Browser Frame */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
                        {/* Browser Header */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-amber-400" />
                                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="px-4 py-1 bg-white dark:bg-slate-600 rounded-md text-xs text-slate-500 dark:text-slate-300">
                                    collabflow.app/document/project-plan
                                </div>
                            </div>
                        </div>

                        {/* Editor Preview */}
                        <div className="p-6 min-h-[400px] relative">
                            {/* Toolbar */}
                            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-700 mb-6">
                                <div className="flex gap-1">
                                    {["B", "I", "U"].map((btn) => (
                                        <div
                                            key={btn}
                                            className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300"
                                        >
                                            {btn}
                                        </div>
                                    ))}
                                </div>
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-2" />
                                <div className="flex gap-1">
                                    {["H1", "H2", "¶"].map((btn) => (
                                        <div
                                            key={btn}
                                            className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300"
                                        >
                                            {btn}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-1" />
                                {/* Live Users */}
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-xs font-medium">
                                        A
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-xs font-medium">
                                        B
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-xs font-medium">
                                        C
                                    </div>
                                </div>
                            </div>

                            {/* Document Content */}
                            <div className="space-y-4">
                                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                                    Q4 Product Roadmap
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400">
                                    This quarter we will focus on three key initiatives:
                                </p>
                                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-2">
                                    <li>Launch collaborative editing features</li>
                                    <li>Improve real-time synchronization</li>
                                    <li>
                                        Add team workspaces
                                        <span className="inline-block ml-1 px-1 bg-blue-500 text-white text-xs rounded animate-pulse">
                                            |
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            {/* Animated Cursors */}
                            <motion.div
                                className="absolute"
                                initial={{ x: 200, y: 180 }}
                                animate={{
                                    x: [200, 350, 280, 200],
                                    y: [180, 200, 240, 180],
                                }}
                                transition={{
                                    duration: 8,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            >
                                <div className="relative">
                                    <MousePointer2 className="w-5 h-5 text-blue-500 fill-blue-500" />
                                    <span className="absolute top-4 left-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full whitespace-nowrap">
                                        Alice
                                    </span>
                                </div>
                            </motion.div>

                            <motion.div
                                className="absolute"
                                initial={{ x: 300, y: 220 }}
                                animate={{
                                    x: [300, 180, 400, 300],
                                    y: [220, 280, 200, 220],
                                }}
                                transition={{
                                    duration: 10,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            >
                                <div className="relative">
                                    <MousePointer2 className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                                    <span className="absolute top-4 left-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full whitespace-nowrap">
                                        Bob
                                    </span>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Feature Badges */}
                    <div className="flex flex-wrap justify-center gap-4 mt-8">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            <Users className="w-4 h-4" />
                            Live presence
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            <MousePointer2 className="w-4 h-4" />
                            Real-time cursors
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                            <Sparkles className="w-4 h-4" />
                            Instant sync
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
