// src/components/landing/HowItWorks.tsx
"use client";

import { motion } from "framer-motion";
import { UserPlus, FileEdit, Share2, CheckCircle2 } from "lucide-react";

const steps = [
    {
        number: "01",
        icon: UserPlus,
        title: "Create your account",
        description: "Sign up in seconds with Google OAuth. No credit card required, no strings attached.",
        color: "blue",
    },
    {
        number: "02",
        icon: FileEdit,
        title: "Start creating",
        description: "Spin up documents, kanban boards, or chat channels. Everything syncs in real-time.",
        color: "violet",
    },
    {
        number: "03",
        icon: Share2,
        title: "Invite your team",
        description: "Share a link or invite by email. Collaborate instantly—no downloads needed.",
        color: "emerald",
    },
    {
        number: "04",
        icon: CheckCircle2,
        title: "Ship together",
        description: "Track progress, discuss inline, and ship faster than ever before.",
        color: "amber",
    },
];

const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-cyan-500",
    violet: "from-violet-500 to-purple-500",
    emerald: "from-emerald-500 to-green-500",
    amber: "from-amber-500 to-orange-500",
};

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="relative py-32 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-background" aria-hidden="true" />
            <div className="noise absolute inset-0" aria-hidden="true" />

            <div className="relative z-10 max-w-5xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <span className="inline-block px-3 py-1 mb-4 text-xs font-medium text-accent bg-accent-muted rounded-full">
                        How It Works
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        From zero to collaborating{" "}
                        <span className="gradient-text">in minutes</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        No complex setup. No learning curve. Just start working.
                    </p>
                </motion.div>

                {/* Steps */}
                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-border via-accent/50 to-border hidden md:block" />

                    <div className="space-y-12">
                        {steps.map((step, i) => (
                            <motion.div
                                key={step.number}
                                initial={{ opacity: 0, x: -24 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="relative flex gap-8 items-start"
                            >
                                {/* Icon */}
                                <div className={`relative flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${colorMap[step.color]} flex items-center justify-center shadow-lg`}>
                                    <step.icon className="w-7 h-7 text-white" />
                                    {/* Connector dot */}
                                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent hidden md:block" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-2">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-xs font-bold text-muted-foreground bg-surface px-2 py-1 rounded">
                                            STEP {step.number}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed max-w-lg">
                                        {step.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
