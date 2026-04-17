// src/components/landing/HeroSection.tsx
"use client";

import { LazyMotion, domAnimation, m } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Github, Sparkles, Zap, Globe, Shield } from "lucide-react";
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
        <LazyMotion features={domAnimation}>
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

            {/* Floating Orbs */}
            <m.div
                animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
                style={{ background: "radial-gradient(circle, hsl(260 80% 60%) 0%, transparent 70%)" }}
                aria-hidden="true"
            />
            <m.div
                animate={{ y: [15, -15, 15], x: [8, -8, 8] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-10"
                style={{ background: "radial-gradient(circle, hsl(190 80% 50%) 0%, transparent 70%)" }}
                aria-hidden="true"
            />

            <m.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center"
            >
                {/* Badge */}
                <m.div variants={itemVariants} className="mb-6 sm:mb-8">
                    <Link
                        href="https://github.com/Bhanuteja-c/collabflow"
                        target="_blank"
                        className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-4 py-2 rounded-full glass shimmer text-xs sm:text-sm font-medium text-foreground/80 hover:text-foreground transition-colors group"
                    >
                        <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                            <span>Introducing CollabFlow v1.0</span>
                        </span>
                        <span className="flex items-center gap-1 text-accent group-hover:translate-x-0.5 transition-transform">
                            <span className="hidden sm:inline">• </span>
                            <span>Star on GitHub</span>
                            <Github className="w-3 h-3 sm:w-4 sm:h-4" />
                        </span>
                    </Link>
                </m.div>

                {/* Logo */}
                <m.div variants={itemVariants} className="mb-6 sm:mb-8 flex justify-center scale-90 sm:scale-100">
                    <Logo size="lg" showText={false} />
                </m.div>

                {/* Heading */}
                <m.h1
                    variants={itemVariants}
                    className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6"
                >
                    <span className="block">The modern way to</span>
                    <span className="gradient-text">collaborate</span>
                </m.h1>

                {/* Subheading */}
                <m.p
                    variants={itemVariants}
                    className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed px-4 sm:px-0"
                >
                    Documents, projects, and conversations—unified in one beautiful workspace.
                    Built for teams who ship fast.
                </m.p>

                {/* CTA Buttons */}
                <m.div
                    variants={itemVariants}
                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 w-full sm:w-auto px-4 sm:px-0"
                >
                    {isLoggedIn ? (
                        <Link
                            href="/dashboard"
                            className="btn-glow w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base inline-flex items-center justify-center gap-2"
                        >
                            Open Workspace
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/sign-in"
                                className="btn-glow w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base inline-flex items-center justify-center gap-2"
                            >
                                Start for free
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Link>
                            <Link
                                href="#features"
                                className="btn-secondary w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base inline-flex items-center justify-center gap-2"
                            >
                                See how it works
                            </Link>
                        </>
                    )}
                </m.div>

                {/* Tech Badges — Honest social proof */}
                <m.div
                    variants={itemVariants}
                    className="flex flex-wrap items-center justify-center gap-3"
                >
                    {[
                        { icon: Zap, label: "Real-time Sync", color: "text-amber-400" },
                        { icon: Globe, label: "Open Source", color: "text-emerald-400" },
                        { icon: Shield, label: "Self-Hostable", color: "text-blue-400" },
                    ].map((badge) => (
                        <div
                            key={badge.label}
                            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-card/30 backdrop-blur-sm text-sm text-muted-foreground"
                        >
                            <badge.icon className={`w-4 h-4 ${badge.color}`} />
                            {badge.label}
                        </div>
                    ))}
                </m.div>

                {/* Built With Strip */}
                <m.div variants={itemVariants} className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground/50">
                    <span>Built with</span>
                    <span className="font-semibold text-muted-foreground/70">Next.js 15</span>
                    <span>•</span>
                    <span className="font-semibold text-muted-foreground/70">TypeScript</span>
                    <span>•</span>
                    <span className="font-semibold text-muted-foreground/70">Socket.io</span>
                    <span>•</span>
                    <span className="font-semibold text-muted-foreground/70">Prisma</span>
                </m.div>
            </m.div>

            {/* Scroll Indicator */}
            <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <m.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
                >
                    <m.div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                </m.div>
            </m.div>
        </section>
        </LazyMotion>
    );
}
