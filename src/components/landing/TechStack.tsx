// src/components/landing/TechStack.tsx
"use client";

import { motion } from "framer-motion";
import TechStackIcon from "tech-stack-icons";

const technologies = [
    { name: "Next.js", icon: "nextjs2", category: "Framework" },
    { name: "React", icon: "react", category: "UI Library" },
    { name: "TypeScript", icon: "typescript", category: "Language" },
    { name: "Tailwind CSS", icon: "tailwindcss", category: "Styling" },
    { name: "PostgreSQL", icon: "postgresql", category: "Database" },
    { name: "Prisma", icon: "prisma", category: "ORM" },
    { name: "Node.js", icon: "nodejs", category: "Runtime" },
    { name: "Framer Motion", icon: "framer", category: "Animation" },
    { name: "GitHub", icon: "github", category: "Version Control" },
    { name: "Vercel", icon: "vercel", category: "Deployment" },
];

export default function TechStack() {
    return (
        <section className="relative py-24 px-6 overflow-hidden border-y border-border">
            <div className="absolute inset-0 bg-surface" aria-hidden="true" />
            <div className="noise absolute inset-0 opacity-10 dark:opacity-50" aria-hidden="true" />

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-3 py-1 mb-4 text-xs font-medium text-accent bg-accent/10 rounded-full border border-accent/20">
                        Built With
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                        Modern, open-source stack
                    </h2>
                </motion.div>

                {/* Marquee Container */}
                <div className="relative overflow-hidden group">
                    {/* Gradient Masks */}
                    <div className="absolute left-0 top-0 bottom-0 w-24 md:w-32 bg-gradient-to-r from-surface to-transparent z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-24 md:w-32 bg-gradient-to-l from-surface to-transparent z-10" />

                    {/* Scrolling Row */}
                    <div className="flex">
                        <motion.div
                            animate={{ x: ["0%", "-50%"] }}
                            transition={{
                                x: {
                                    repeat: Infinity,
                                    repeatType: "loop",
                                    duration: 40,
                                    ease: "linear",
                                },
                            }}
                            className="flex gap-6 pr-6 w-max items-center"
                        >
                            {[...technologies, ...technologies, ...technologies].map((tech, i) => (
                                <div
                                    key={`${tech.name}-${i}`}
                                    className="flex-shrink-0 flex items-center gap-4 px-6 py-4 rounded-2xl border border-black/5 dark:border-white/5 bg-background/50 dark:bg-card/50 backdrop-blur-md hover:bg-background/80 dark:hover:bg-card hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 w-64 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.1)] group/card cursor-default"
                                >
                                    <div className="w-12 h-12 flex items-center justify-center bg-surface rounded-xl shadow-inner border border-black/5 dark:border-white/10 group-hover/card:scale-110 transition-transform duration-300">
                                        <TechStackIcon name={tech.icon} className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-base font-semibold group-hover/card:text-foreground text-foreground/80 dark:text-foreground/90 transition-colors">
                                            {tech.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground font-medium">
                                            {tech.category}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
