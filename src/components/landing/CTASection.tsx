// src/components/landing/CTASection.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";

export default function CTASection() {
    const { status } = useSession();
    const isLoggedIn = status === "authenticated";

    return (
        <section className="py-24 px-4 bg-slate-900 dark:bg-slate-950">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-3xl mx-auto text-center"
            >
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-4">
                    Start collaborating today
                </h2>
                <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
                    Join thousands of teams who have simplified their workflow with CollabFlow.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {isLoggedIn ? (
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors"
                        >
                            Go to Dashboard
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/sign-in"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors"
                            >
                                Get started free
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/sign-in"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-slate-700 text-white font-medium hover:bg-slate-800 transition-colors"
                            >
                                Sign in
                            </Link>
                        </>
                    )}
                </div>

                <p className="mt-6 text-sm text-slate-500">
                    No credit card required • Free forever tier
                </p>
            </motion.div>
        </section>
    );
}
