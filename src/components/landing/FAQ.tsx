// src/components/landing/FAQ.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
    {
        question: "Is CollabFlow really free?",
        answer: "Yes! CollabFlow is 100% free and open-source under the MIT license. There are no hidden fees, no premium tiers, and no artificial limitations. You can use it forever without paying anything.",
    },
    {
        question: "Can I self-host CollabFlow?",
        answer: "Absolutely. CollabFlow is designed to be self-hosted on your own infrastructure. Clone the repo, configure your environment, and deploy to your preferred platform. Full documentation is available.",
    },
    {
        question: "What about my data privacy?",
        answer: "You own your data. When self-hosted, your data never leaves your servers. We don't track, sell, or share anything. The code is open-source, so you can audit exactly what happens with your data.",
    },
    {
        question: "How does real-time collaboration work?",
        answer: "We use Yjs, a proven CRDT (Conflict-free Replicated Data Type) library, combined with WebSocket connections for instant synchronization. Changes propagate to all connected users in milliseconds.",
    },
    {
        question: "What tech stack does CollabFlow use?",
        answer: "CollabFlow is built with Next.js 15, React 19, TypeScript, Tailwind CSS, PostgreSQL, Prisma, NextAuth.js, and Yjs. All modern, battle-tested technologies.",
    },
    {
        question: "How can I contribute?",
        answer: "We welcome contributions! Check out our GitHub repository, read the contributing guide, and submit a pull request. Whether it's code, documentation, or bug reports—every contribution helps.",
    },
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="relative py-32 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-background" aria-hidden="true" />
            <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" aria-hidden="true" />

            <div className="relative z-10 max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-3 py-1 mb-4 text-xs font-medium text-accent bg-accent-muted rounded-full">
                        FAQ
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Common questions
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Everything you need to know about CollabFlow.
                    </p>
                </motion.div>

                {/* Accordion */}
                <div className="space-y-3">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full p-5 rounded-xl border border-border bg-card hover:bg-surface-elevated transition-colors text-left flex items-center justify-between gap-4"
                            >
                                <span className="font-medium">{faq.question}</span>
                                <ChevronDown
                                    className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openIndex === index ? "rotate-180" : ""
                                        }`}
                                />
                            </button>
                            <AnimatePresence>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-5 py-4 text-muted-foreground leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
