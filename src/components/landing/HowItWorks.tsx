// src/components/landing/HowItWorks.tsx
"use client";

import { motion } from "framer-motion";
import { UserPlus, FileEdit, Share2 } from "lucide-react";

const steps = [
    {
        number: "01",
        icon: UserPlus,
        title: "Create your account",
        description: "Sign up in seconds with Google. No credit card required.",
    },
    {
        number: "02",
        icon: FileEdit,
        title: "Create a document",
        description: "Start writing with our powerful rich-text editor.",
    },
    {
        number: "03",
        icon: Share2,
        title: "Invite your team",
        description: "Share the link and collaborate in real-time.",
    },
];

export default function HowItWorks() {
    return (
        <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                        How it works
                    </p>
                    <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        Start collaborating in 3 simple steps
                    </h2>
                </motion.div>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.number}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="relative"
                        >
                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className="hidden md:block absolute top-12 left-full w-full h-px bg-slate-200 dark:bg-slate-700 -translate-x-1/2 z-0" />
                            )}

                            <div className="relative z-10 text-center">
                                {/* Icon Circle */}
                                <div className="mx-auto w-24 h-24 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6 shadow-lg">
                                    <step.icon className="w-10 h-10 text-slate-700 dark:text-slate-300" />
                                </div>

                                {/* Step Number */}
                                <span className="inline-block px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-full mb-4">
                                    Step {step.number}
                                </span>

                                {/* Title */}
                                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                                    {step.title}
                                </h3>

                                {/* Description */}
                                <p className="text-slate-600 dark:text-slate-400">
                                    {step.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
