// src/components/landing/FeatureCard.tsx
"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    gradient: string;
    delay?: number;
}

export default function FeatureCard({
    icon: Icon,
    title,
    description,
    gradient,
    delay = 0,
}: FeatureCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay,
            }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative"
        >
            {/* Glow effect on hover */}
            <div
                className={`absolute inset-0 ${gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`}
            />

            {/* Card */}
            <div className="relative glass rounded-3xl p-8 h-full border border-white/20 dark:border-white/10 transition-all duration-300">
                {/* Icon */}
                <motion.div
                    className={`w-16 h-16 ${gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
                    whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                >
                    <Icon className="w-8 h-8 text-white" />
                </motion.div>

                {/* Content */}
                <h3 className="text-2xl font-bold mb-3 text-foreground">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{description}</p>

                {/* Decorative corner */}
                <div
                    className={`absolute top-0 right-0 w-24 h-24 ${gradient} opacity-5 rounded-bl-[100px] rounded-tr-3xl`}
                />
            </div>
        </motion.div>
    );
}
