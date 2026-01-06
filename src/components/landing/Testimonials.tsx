// src/components/landing/Testimonials.tsx
"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
    {
        name: "Sarah Chen",
        role: "Product Manager",
        company: "TechStartup",
        avatar: "SC",
        content: "CollabFlow completely transformed how our remote team collaborates. The real-time sync is genuinely instant—no more 'can you refresh?' moments.",
        rating: 5,
        gradient: "from-blue-500 to-cyan-500",
    },
    {
        name: "Marcus Johnson",
        role: "Engineering Lead",
        company: "DevAgency",
        avatar: "MJ",
        content: "We evaluated 6 different tools. CollabFlow won because it just works. The open-source nature means we can actually trust it.",
        rating: 5,
        gradient: "from-violet-500 to-purple-500",
    },
    {
        name: "Emily Watson",
        role: "Design Director",
        company: "CreativeStudio",
        avatar: "EW",
        content: "The dark mode is chef's kiss. Finally a productivity tool that understands designers don't want eye strain at 2am.",
        rating: 5,
        gradient: "from-pink-500 to-rose-500",
    },
];

export default function Testimonials() {
    return (
        <section className="relative py-32 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-surface" aria-hidden="true" />
            <div className="noise absolute inset-0" aria-hidden="true" />

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-3 py-1 mb-4 text-xs font-medium text-accent bg-accent-muted rounded-full">
                        Testimonials
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Loved by teams{" "}
                        <span className="gradient-text">everywhere</span>
                    </h2>
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                            ))}
                        </div>
                        <span className="text-muted-foreground">
                            <span className="font-semibold text-foreground">4.9/5</span> from 500+ reviews
                        </span>
                    </div>
                </motion.div>

                {/* Testimonials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, i) => (
                        <motion.div
                            key={testimonial.name}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="relative p-6 rounded-2xl border border-border bg-card card-hover"
                        >
                            {/* Quote Icon */}
                            <Quote className="absolute top-4 right-4 w-8 h-8 text-border" />

                            {/* Stars */}
                            <div className="flex gap-1 mb-4">
                                {Array.from({ length: testimonial.rating }).map((_, idx) => (
                                    <Star key={idx} className="w-4 h-4 text-amber-400 fill-amber-400" />
                                ))}
                            </div>

                            {/* Content */}
                            <p className="text-foreground mb-6 leading-relaxed">
                                "{testimonial.content}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white text-sm font-semibold`}>
                                    {testimonial.avatar}
                                </div>
                                <div>
                                    <div className="font-medium text-sm">{testimonial.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {testimonial.role} at {testimonial.company}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Trust Badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-muted-foreground"
                >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                        <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        100% Open Source
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                        <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        MIT Licensed
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                        <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Self-hostable
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
