// src/components/landing/FeaturesSection.tsx
"use client";

import { motion } from "framer-motion";
import {
    FileText,
    Users,
    Zap,
    Lock,
    MessageSquare,
    LayoutGrid,
} from "lucide-react";

const features = [
    {
        icon: FileText,
        title: "Document Editor",
        description:
            "Rich text editing with real-time collaboration. See changes as they happen.",
    },
    {
        icon: Users,
        title: "Team Presence",
        description:
            "Know who's online with live cursors and user awareness.",
    },
    {
        icon: MessageSquare,
        title: "Integrated Chat",
        description:
            "Discuss work instantly without switching between apps.",
    },
    {
        icon: LayoutGrid,
        title: "Kanban Boards",
        description:
            "Visual project management with drag-and-drop simplicity.",
    },
    {
        icon: Zap,
        title: "Instant Sync",
        description:
            "Changes sync in milliseconds. No refresh needed, ever.",
    },
    {
        icon: Lock,
        title: "Enterprise Security",
        description:
            "SOC 2 compliant with end-to-end encryption and SSO.",
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4 },
    },
};

export default function FeaturesSection() {
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
                        Features
                    </p>
                    <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">
                        Everything you need to collaborate
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Built for teams who value simplicity and productivity
                    </p>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {features.map((feature) => (
                        <motion.div
                            key={feature.title}
                            variants={itemVariants}
                            className="group p-6 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-lg transition-all duration-200 bg-white dark:bg-slate-900"
                        >
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-slate-900 dark:group-hover:bg-white transition-colors">
                                <feature.icon className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-white dark:group-hover:text-slate-900 transition-colors" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
