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

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <span className="inline-block px-3 py-1 mb-4 text-xs font-medium text-accent bg-accent-muted rounded-full">
                        Built With
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                        Modern, open-source stack
                    </h2>
                </motion.div>

                {/* Marquee Container */}
                <div className="relative overflow-hidden">
                    {/* Gradient Masks */}
                    <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-surface to-transparent z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-surface to-transparent z-10" />

                    {/* Scrolling Row */}
                    <div className="flex gap-6 animate-marquee">
                        {[...technologies, ...technologies].map((tech, i) => (
                            <div
                                key={`${tech.name}-${i}`}
                                className="flex-shrink-0 flex items-center gap-4 px-6 py-4 rounded-xl border border-border bg-card hover:bg-surface-elevated transition-colors group cursor-default"
                            >
                                <div className="w-10 h-10 flex items-center justify-center">
                                    <TechStackIcon name={tech.icon} className="w-8 h-8" />
                                </div>
                                <div>
                                    <div className="text-base font-semibold group-hover:text-accent transition-colors">
                                        {tech.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {tech.category}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Static Grid for Mobile */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:hidden gap-4 mt-8">
                    {technologies.slice(0, 6).map((tech) => (
                        <div
                            key={tech.name}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card"
                        >
                            <TechStackIcon name={tech.icon} className="w-8 h-8" />
                            <div className="text-sm font-medium text-center">{tech.name}</div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
                @media (max-width: 768px) {
                    .animate-marquee {
                        display: none;
                    }
                }
            `}</style>
        </section>
    );
}
