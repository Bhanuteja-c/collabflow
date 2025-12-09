// src/components/landing/Testimonials.tsx
"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
    {
        name: "Sarah Chen",
        role: "Product Manager",
        company: "TechStartup",
        avatar: "SC",
        content:
            "CollabFlow transformed how our remote team works together. The real-time collaboration is seamless.",
        rating: 5,
    },
    {
        name: "Michael Roberts",
        role: "Engineering Lead",
        company: "DevAgency",
        avatar: "MR",
        content:
            "Finally, a collaboration tool that doesn't slow us down. The sync speed is incredible.",
        rating: 5,
    },
    {
        name: "Emily Watson",
        role: "Design Director",
        company: "CreativeStudio",
        avatar: "EW",
        content:
            "The clean interface lets us focus on what matters - our work. No distractions, just productivity.",
        rating: 5,
    },
];

export default function Testimonials() {
    return (
        <section className="py-24 px-4 bg-white dark:bg-slate-900">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                        Testimonials
                    </p>
                    <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        Loved by teams everywhere
                    </h2>
                </motion.div>

                {/* Testimonials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="p-6 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                        >
                            {/* Stars */}
                            <div className="flex gap-1 mb-4">
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
                                    <Star
                                        key={i}
                                        className="w-4 h-4 text-amber-400 fill-amber-400"
                                    />
                                ))}
                            </div>

                            {/* Quote */}
                            <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                                "{testimonial.content}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-300">
                                    {testimonial.avatar}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                                        {testimonial.name}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {testimonial.role} at {testimonial.company}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
