// src/components/landing/HeroSection.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useTheme } from "next-themes";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" },
    },
};

export default function HeroSection() {
    const { data: session, status } = useSession();
    const { theme, resolvedTheme } = useTheme();
    const isLoggedIn = status === "authenticated";
    const isDark = resolvedTheme === "dark";

    return (
        <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
            {/* Subtle Grid Pattern */}
            <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-4xl mx-auto text-center relative z-10"
            >
                {/* Logo - Theme Aware */}
                <motion.div variants={itemVariants} className="mb-8">
                    <Image
                        src={isDark ? "/DarkMode-CollabFlow-logo-transparent.png" : "/whiteMode-CollabFlow-minimal-icon.png"}
                        alt="CollabFlow"
                        width={200}
                        height={80}
                        className="mx-auto h-20 w-auto"
                        priority
                    />
                </motion.div>

                {/* Badge */}
                <motion.div variants={itemVariants} className="mb-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        100% Open Source
                    </span>
                </motion.div>

                {/* Heading */}
                <motion.h1
                    variants={itemVariants}
                    className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6 text-slate-900 dark:text-white"
                >
                    The modern way to
                    <br />
                    <span className="gradient-text">collaborate</span> with your team
                </motion.h1>

                {/* Subheading */}
                <motion.p
                    variants={itemVariants}
                    className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
                >
                    Create documents, manage projects, and communicate seamlessly.
                    Everything your team needs in one powerful workspace.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    variants={itemVariants}
                    className="flex flex-col sm:flex-row gap-3 justify-center"
                >
                    {isLoggedIn ? (
                        <Link
                            href="/dashboard"
                            className="btn-primary px-6 py-3 rounded-lg text-base inline-flex items-center justify-center gap-2"
                        >
                            Go to Dashboard
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/sign-in"
                                className="btn-primary px-6 py-3 rounded-lg text-base inline-flex items-center justify-center gap-2"
                            >
                                Get started free
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="#features"
                                className="px-6 py-3 rounded-lg text-base font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
                            >
                                <Play className="w-4 h-4" />
                                Watch demo
                            </Link>
                        </>
                    )}
                </motion.div>

                {/* Social Proof */}
                <motion.div
                    variants={itemVariants}
                    className="mt-12 flex items-center justify-center gap-6 text-sm text-slate-500"
                >
                    <div className="flex -space-x-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900"
                            />
                        ))}
                    </div>
                    <span>Trusted by 1,000+ teams worldwide</span>
                </motion.div>
            </motion.div>
        </section>
    );
}
