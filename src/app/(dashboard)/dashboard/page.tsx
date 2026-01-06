// src/app/(dashboard)/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Plus,
    FileText,
    Clock,
    Star,
    TrendingUp,
    Users,
    MoreHorizontal,
    ArrowUpRight,
    Zap,
    Calendar,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
};

const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
};

const recentDocuments = [
    {
        id: "1",
        title: "Project Roadmap 2025",
        updatedAt: "2 hours ago",
        starred: true,
    },
    {
        id: "2",
        title: "Team Meeting Notes",
        updatedAt: "Yesterday",
        starred: false,
    },
    {
        id: "3",
        title: "Product Requirements",
        updatedAt: "3 days ago",
        starred: true,
    },
    {
        id: "4",
        title: "Design System",
        updatedAt: "1 week ago",
        starred: false,
    },
];

const stats = [
    {
        label: "Documents",
        value: "12",
        icon: FileText,
        change: "+3",
        color: "from-blue-500 to-indigo-500",
    },
    {
        label: "Active Today",
        value: "3",
        icon: Zap,
        change: "",
        color: "from-amber-500 to-orange-500",
    },
    {
        label: "Team Members",
        value: "8",
        icon: Users,
        change: "+2",
        color: "from-emerald-500 to-green-500",
    },
    {
        label: "Productivity",
        value: "94%",
        icon: TrendingUp,
        change: "+12%",
        color: "from-violet-500 to-purple-500",
    },
];

const quickActions = [
    { icon: FileText, label: "New Doc", href: "/editor", color: "bg-blue-500" },
    { icon: Calendar, label: "Schedule", href: "/kanban", color: "bg-violet-500" },
    { icon: Users, label: "Invite", href: "/settings", color: "bg-emerald-500" },
];

export default function Dashboard() {
    const { data: session } = useSession();
    const user = session?.user;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                        {getGreeting()}, {user?.name?.split(" ")[0] || "there"} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Here's what's happening with your projects today.
                    </p>
                </div>
                <Button asChild className="btn-glow w-fit">
                    <Link href="/editor" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Document
                    </Link>
                </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
                {stats.map((stat) => (
                    <motion.div key={stat.label} variants={item}>
                        <Card className="hover:shadow-md transition-all hover:scale-[1.02] overflow-hidden">
                            <CardContent className="p-4 relative">
                                {/* Gradient icon background */}
                                <div
                                    className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${stat.color} opacity-10`}
                                    aria-hidden="true"
                                />
                                <div className="flex items-center justify-between mb-3 relative">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                        <stat.icon className="w-5 h-5 text-white" />
                                    </div>
                                    {stat.change && (
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                                            {stat.change}
                                        </span>
                                    )}
                                </div>
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-wrap gap-3"
            >
                {quickActions.map((action) => (
                    <Link key={action.label} href={action.href}>
                        <Button variant="outline" className="gap-2 hover:shadow-sm">
                            <div className={`w-5 h-5 rounded ${action.color} flex items-center justify-center`}>
                                <action.icon className="w-3 h-3 text-white" />
                            </div>
                            {action.label}
                        </Button>
                    </Link>
                ))}
            </motion.div>

            {/* Recent Documents */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Documents</h2>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/documents" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            View all
                            <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recentDocuments.map((doc) => (
                        <Link href="/editor" key={doc.id}>
                            <Card className="group hover:shadow-md hover:border-accent/50 transition-all cursor-pointer h-full">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {doc.starred && (
                                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <h3 className="font-medium text-sm group-hover:text-accent transition-colors line-clamp-2">
                                        {doc.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {doc.updatedAt}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}

                    {/* New Document */}
                    <Link href="/editor">
                        <Card className="group hover:shadow-md hover:border-accent/50 transition-all cursor-pointer h-full border-dashed">
                            <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[140px] text-muted-foreground group-hover:text-accent">
                                <div className="w-12 h-12 rounded-xl border-2 border-dashed border-current flex items-center justify-center mb-2 group-hover:border-accent">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-medium">Create New</span>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
