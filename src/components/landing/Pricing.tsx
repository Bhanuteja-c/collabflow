// src/components/landing/Pricing.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Sparkles, Github } from "lucide-react";

const features = [
    "Unlimited documents",
    "Real-time collaboration",
    "Kanban boards",
    "Team chat",
    "Version history",
    "Dark & light mode",
    "Self-hosting option",
    "API access",
    "Community support",
    "MIT License",
];

export default function Pricing() {
    return (
        <section id="pricing" className="relative py-32 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-surface" aria-hidden="true" />
            <div className="noise absolute inset-0" aria-hidden="true" />

            <div className="relative z-10 max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-3 py-1 mb-4 text-xs font-medium text-accent bg-accent-muted rounded-full">
                        Pricing
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Free forever.{" "}
                        <span className="gradient-text">No catch.</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        CollabFlow is open-source software. Use it, modify it, host it yourself—completely free.
                    </p>
                </motion.div>

                {/* Pricing Card */}
                <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="relative max-w-lg mx-auto"
                >
                    {/* Glow */}
                    <div
                        aria-hidden="true"
                        className="absolute -inset-4 rounded-3xl opacity-50"
                        style={{
                            background: "radial-gradient(ellipse at center, hsl(221 83% 53% / 0.15) 0%, transparent 70%)",
                        }}
                    />

                    <div className="relative p-8 md:p-10 rounded-2xl border border-border bg-card shadow-lg">
                        {/* Badge */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium shadow-lg">
                                <Sparkles className="w-4 h-4" />
                                100% Free
                            </span>
                        </div>

                        {/* Price */}
                        <div className="text-center mb-8 pt-4">
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-6xl font-bold">$0</span>
                                <span className="text-muted-foreground">/forever</span>
                            </div>
                            <p className="text-muted-foreground mt-2">
                                For individuals and teams of any size
                            </p>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                            {features.map((feature) => (
                                <div key={feature} className="flex items-center gap-2 text-sm">
                                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="space-y-3">
                            <Link
                                href="/sign-in"
                                className="btn-glow w-full px-6 py-4 rounded-xl text-base inline-flex items-center justify-center gap-2"
                            >
                                Get started for free
                            </Link>
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary w-full px-6 py-4 rounded-xl text-base inline-flex items-center justify-center gap-2"
                            >
                                <Github className="w-5 h-5" />
                                View on GitHub
                            </a>
                        </div>
                    </div>
                </motion.div>

                {/* Trust Note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-sm text-muted-foreground mt-8"
                >
                    No credit card required • No hidden fees • No vendor lock-in
                </motion.p>
            </div>
        </section>
    );
}
