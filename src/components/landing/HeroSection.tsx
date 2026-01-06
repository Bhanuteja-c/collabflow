// src/components/landing/HeroSection.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Github, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import Logo from "@/components/ui/Logo";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    },
};

export default function HeroSection() {
    const { status } = useSession();
    const isLoggedIn = status === "authenticated";

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Aurora Background */}
            <div className="bg-aurora absolute inset-0" aria-hidden="true" />

            {/* Gradient Overlay */}
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background"
            />

            {/* Grid Pattern */}
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-grid opacity-[0.02] dark:opacity-[0.03]"
            />

            {/* Noise Texture */}
            <div className="noise absolute inset-0" aria-hidden="true" />

            {/* Radial Glow */}
            <div
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full opacity-30 dark:opacity-40"
                style={{
                    background: "radial-gradient(circle, hsl(221 83% 53% / 0.15) 0%, transparent 70%)",
                }}
            />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 max-w-5xl mx-auto px-6 py-32 text-center"
            >
                {/* Badge */}
                <motion.div variants={itemVariants} className="mb-8">
                    <Link
                        href="https://github.com"
                        target="_blank"
                        className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass shimmer text-sm font-medium text-foreground/80 hover:text-foreground transition-colors group"
                    >
                        <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-accent" />
                            <span>Introducing CollabFlow v1.0</span>
                        </span>
                        <span className="flex items-center gap-1 text-accent group-hover:translate-x-0.5 transition-transform">
                            <span>Star on GitHub</span>
                            <Github className="w-4 h-4" />
                        </span>
                    </Link>
                </motion.div>

                {/* Logo */}
                <motion.div variants={itemVariants} className="mb-8 flex justify-center">
                    <Logo size="lg" showText={false} />
                </motion.div>

                {/* Heading */}
                <motion.h1
                    variants={itemVariants}
                    className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6"
                >
                    <span className="block">The modern way to</span>
                    <span className="gradient-text">collaborate</span>
                </motion.h1>

                {/* Subheading */}
                <motion.p
                    variants={itemVariants}
                    className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
                >
                    Documents, projects, and conversations—unified in one beautiful workspace.
                    Built for teams who ship fast.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    variants={itemVariants}
                    className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
                >
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
                                Start for free
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                href="#features"
                                className="btn-secondary px-8 py-4 rounded-xl text-base inline-flex items-center justify-center gap-2"
                            >
                                See how it works
                            </Link>
                        </>
                    )}
                </motion.div>

                {/* Social Proof */}
                <motion.div
                    variants={itemVariants}
                    className="flex flex-col sm:flex-row items-center justify-center gap-6"
                >
                    {/* Avatars */}
                    <div className="flex items-center">
                        <div className="flex -space-x-3">
                            {["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"].map((color, i) => (
                                <div
                                    key={i}
                                    className={`w-10 h-10 rounded-full ${color} border-[3px] border-background flex items-center justify-center text-white text-xs font-semibold`}
                                >
                                    {String.fromCharCode(65 + i)}
                                </div>
                            ))}
                        </div>
                        <div className="ml-4 text-left">
                            <div className="flex items-center gap-1 text-amber-500">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Loved by <span className="text-foreground font-medium">1,000+</span> teams
                            </p>
                        </div>
                    </div>

                    <div className="hidden sm:block w-px h-12 bg-border" />

                    {/* Stats */}
                    <div className="flex gap-8 text-center">
                        <div>
                            <div className="text-2xl font-bold">99.9%</div>
                            <div className="text-sm text-muted-foreground">Uptime</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">&lt;50ms</div>
                            <div className="text-sm text-muted-foreground">Sync latency</div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
                >
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                </motion.div>
            </motion.div>
        </section>
    );
}
