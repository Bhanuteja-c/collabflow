// src/components/landing/CTASection.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";

export default function CTASection() {
    const { status } = useSession();
    const isLoggedIn = status === "authenticated";

    return (
        <section className="relative py-32 px-6 overflow-hidden bg-surface">
            {/* Subtle gradient overlay */}
            <div
                className="absolute inset-0"
                style={{
                    background: "radial-gradient(ellipse at center top, hsl(221 83% 53% / 0.08) 0%, transparent 50%)",
                }}
                aria-hidden="true"
            />

            {/* Noise */}
            <div className="noise absolute inset-0" aria-hidden="true" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative z-10 max-w-3xl mx-auto text-center"
            >
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-border bg-card text-muted-foreground text-sm"
                >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Free forever. No credit card needed.
                </motion.div>

                {/* Heading */}
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                    Ready to transform{" "}
                    <span className="gradient-text">how you work?</span>
                </h2>

                <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                    Join teams who've already made the switch. Your workspace awaits.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {isLoggedIn ? (
                        <Link
                            href="/dashboard"
                            className="btn-glow px-8 py-4 rounded-xl text-base inline-flex items-center justify-center gap-2"
                        >
                            Go to Dashboard
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/sign-in"
                                className="btn-glow px-8 py-4 rounded-xl text-base inline-flex items-center justify-center gap-2"
                            >
                                Get started for free
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                href="/sign-in"
                                className="btn-secondary px-8 py-4 rounded-xl text-base inline-flex items-center justify-center gap-2"
                            >
                                Schedule a demo
                            </Link>
                        </>
                    )}
                </div>

                {/* Trust Line */}
                <p className="mt-8 text-sm text-muted-foreground">
                    Open source • Self-hostable • MIT Licensed
                </p>
            </motion.div>
        </section>
    );
}
