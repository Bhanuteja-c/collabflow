// src/components/landing/ProductDemo.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MousePointer2, MessageSquare, LayoutGrid, FileText, CheckCircle2, Clock, Send } from "lucide-react";

type DemoTab = "docs" | "kanban" | "chat";

const tabs: { key: DemoTab; label: string; icon: React.ElementType }[] = [
    { key: "docs", label: "Documents", icon: FileText },
    { key: "kanban", label: "Kanban", icon: LayoutGrid },
    { key: "chat", label: "Chat", icon: MessageSquare },
];

function DocsView() {
    return (
        <div className="flex-1 p-4 sm:p-8 relative overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 pb-4 border-b border-border mb-6">
                {["B", "I", "U", "H1", "H2", "•"].map((btn) => (
                    <div
                        key={btn}
                        className="w-8 h-8 rounded-lg bg-surface hover:bg-surface/80 flex items-center justify-center text-xs font-semibold text-muted-foreground cursor-pointer transition-colors"
                    >
                        {btn}
                    </div>
                ))}
            </div>

            {/* Document */}
            <div className="space-y-4 max-w-2xl">
                <h1 className="text-2xl font-bold">Q4 Product Roadmap</h1>
                <p className="text-muted-foreground">
                    This quarter we focus on three key initiatives:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                        <span className="text-accent">•</span>
                        Launch collaborative editing features
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-accent">•</span>
                        Improve real-time synchronization
                    </li>
                    <li className="flex items-start gap-2 relative">
                        <span className="text-accent">•</span>
                        <span>Add team workspaces</span>
                        <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="inline-block w-0.5 h-5 bg-blue-500 ml-1"
                        />
                    </li>
                </ul>
            </div>

            {/* Animated Cursors */}
            <motion.div
                className="absolute pointer-events-none"
                initial={{ x: 280, y: 200 }}
                animate={{ x: [280, 420, 350, 280], y: [200, 240, 280, 200] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            >
                <MousePointer2 className="w-5 h-5 text-blue-500 fill-blue-500 drop-shadow-lg" />
                <span className="absolute top-5 left-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium shadow-lg">
                    Alice
                </span>
            </motion.div>

            <motion.div
                className="absolute pointer-events-none"
                initial={{ x: 360, y: 260 }}
                animate={{ x: [360, 240, 440, 360], y: [260, 320, 240, 260] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            >
                <MousePointer2 className="w-5 h-5 text-emerald-500 fill-emerald-500 drop-shadow-lg" />
                <span className="absolute top-5 left-1 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full font-medium shadow-lg">
                    Bob
                </span>
            </motion.div>
        </div>
    );
}

function KanbanView() {
    const columns = [
        {
            title: "To Do",
            color: "border-blue-500/50",
            cards: [
                { title: "Design landing page", priority: "high", tag: "Design" },
                { title: "Write API docs", priority: "low", tag: "Docs" },
            ],
        },
        {
            title: "In Progress",
            color: "border-amber-500/50",
            cards: [
                { title: "Build auth system", priority: "high", tag: "Backend" },
                { title: "Socket.io integration", priority: "medium", tag: "Real-time" },
            ],
        },
        {
            title: "Review",
            color: "border-purple-500/50",
            cards: [
                { title: "File upload feature", priority: "medium", tag: "Feature" },
            ],
        },
        {
            title: "Done",
            color: "border-emerald-500/50",
            cards: [
                { title: "Project setup", priority: "low", tag: "Infra" },
                { title: "Database schema", priority: "high", tag: "Backend" },
            ],
        },
    ];

    const priorityColors: Record<string, string> = {
        high: "bg-red-500",
        medium: "bg-amber-500",
        low: "bg-emerald-500",
    };

    return (
        <div className="flex-1 p-4 overflow-x-auto">
            <div className="flex gap-3 min-w-[700px] h-full">
                {columns.map((col, ci) => (
                    <motion.div
                        key={col.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: ci * 0.1, duration: 0.4 }}
                        className={`flex-1 min-w-[160px] rounded-xl bg-surface/50 border-t-2 ${col.color} p-2.5`}
                    >
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">{col.title}</span>
                            <span className="text-[10px] text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">{col.cards.length}</span>
                        </div>
                        <div className="space-y-2">
                            {col.cards.map((card, i) => (
                                <motion.div
                                    key={card.title}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: ci * 0.1 + i * 0.08, duration: 0.3 }}
                                    whileHover={{ scale: 1.02, y: -1 }}
                                    className="p-2.5 rounded-lg bg-card border border-border/50 hover:border-border hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start gap-2">
                                        <div className={`w-1.5 h-4 rounded-full mt-0.5 ${priorityColors[card.priority]}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-foreground/90 truncate group-hover:text-accent transition-colors">{card.title}</p>
                                            <span className="text-[9px] text-muted-foreground/70 bg-background/50 px-1.5 py-0.5 rounded mt-1 inline-block">{card.tag}</span>
                                        </div>
                                    </div>
                                    {col.title === "Done" && (
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-1.5 ml-3.5" />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function ChatView() {
    const messages = [
        { user: "Alice", color: "bg-blue-500", time: "2:34 PM", text: "Just pushed the kanban drag-and-drop feature! 🎉" },
        { user: "Bob", color: "bg-emerald-500", time: "2:35 PM", text: "Nice! I'll review the PR right now." },
        { user: "Carol", color: "bg-violet-500", time: "2:36 PM", text: "The real-time sync is working perfectly on my end." },
        { user: "Alice", color: "bg-blue-500", time: "2:37 PM", text: "Great, let's ship it today then! 🚀" },
    ];

    return (
        <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <span className="text-sm font-semibold"># project-collabflow</span>
                <span className="text-[10px] text-muted-foreground/60 bg-background/50 px-1.5 py-0.5 rounded">4 members</span>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15, duration: 0.35 }}
                        className="flex gap-3"
                    >
                        <div className={`w-8 h-8 rounded-full ${msg.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                            {msg.user[0]}
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-semibold">{msg.user}</span>
                                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{msg.text}</p>
                        </div>
                    </motion.div>
                ))}

                {/* Typing indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex items-center gap-2 text-xs text-muted-foreground/60"
                >
                    <div className="flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
                            />
                        ))}
                    </div>
                    <span>Bob is typing...</span>
                </motion.div>
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
                    <span className="text-sm text-muted-foreground/50 flex-1">Message #project-collabflow</span>
                    <Send className="w-4 h-4 text-muted-foreground/30" />
                </div>
            </div>
        </div>
    );
}

export default function ProductDemo() {
    const [activeTab, setActiveTab] = useState<DemoTab>("docs");

    return (
        <section className="relative py-32 px-6 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-surface" aria-hidden="true" />
            
            {/* Dynamic grid background */}
            <div 
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)`,
                    backgroundSize: '4rem 4rem'
                }}
            />

            <div className="relative z-10 max-w-6xl mx-auto perspective-1000">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-blue-500 bg-blue-500/10 border border-blue-500/20 rounded-full">
                        Live Preview
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                        Real-time collaboration,{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">reimagined</span>
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        See your team&apos;s changes instantly. No refresh, no conflicts, just flow.
                    </p>
                </motion.div>

                {/* Browser Window with 3D Float */}
                <motion.div
                    initial={{ opacity: 0, y: 48, rotateX: 15 }}
                    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 1, type: "spring", bounce: 0.4 }}
                    whileHover={{ scale: 1.02, rotateX: 2, rotateY: -1 }}
                    className="relative transform-gpu w-full"
                >
                    {/* Background glow behind window */}
                    <div
                        aria-hidden="true"
                        className="absolute -inset-10 rounded-[3rem] opacity-30 blur-3xl transition-opacity duration-500"
                        style={{
                            background: "radial-gradient(circle at center, hsl(var(--accent)), transparent 60%)",
                        }}
                    />

                    {/* Browser Frame */}
                    <div className="relative rounded-2xl border border-black/10 dark:border-white/10 bg-background/90 dark:bg-background/80 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
                        {/* Browser Header (Mac OS Style) */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-surface/50 dark:bg-surface/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 relative">
                            {/* Window Controls */}
                            <div className="flex gap-2 w-20">
                                <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-sm hover:brightness-110 transition-all cursor-pointer" />
                                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-sm hover:brightness-110 transition-all cursor-pointer" />
                                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-sm hover:brightness-110 transition-all cursor-pointer" />
                            </div>
                            
                            {/* URL Bar */}
                            <div className="flex-1 flex justify-center pb-1">
                                <div className="flex items-center gap-2 px-8 py-1.5 bg-background shadow-inner rounded-md text-[11px] text-muted-foreground font-medium border border-border/50 transition-colors hover:bg-surface w-full max-w-sm justify-center group/url">
                                    <svg className="w-3 h-3 text-muted-foreground/60 group-hover/url:text-accent transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3v3H9V7c0-1.654 1.346-3 3-3zm-5 7h10v8H7v-8z"/></svg>
                                    collabflow.app/workspace/my-team
                                </div>
                            </div>

                            {/* Right side spacer to balance traffic lights */}
                            <div className="flex gap-2 sm:w-20 justify-end">
                                <div className="flex -space-x-2 hidden sm:flex">
                                    {["bg-blue-500", "bg-emerald-500", "bg-violet-500"].map((color, i) => (
                                        <div key={i} className={`w-5 h-5 rounded-full ${color} border-2 border-surface flex items-center justify-center text-white text-[9px] font-bold shadow-sm z-${30-i}`}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* App Layout */}
                        <div className="flex flex-col md:flex-row min-h-[460px] bg-background">
                            {/* Sidebar with Tabs */}
                            <div className="w-48 border-r border-black/5 dark:border-white/5 p-3 bg-surface/30 hidden md:flex flex-col gap-1 backdrop-blur-md">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 text-left w-full relative ${
                                            activeTab === tab.key
                                                ? "text-accent"
                                                : "text-muted-foreground hover:bg-surface hover:text-foreground"
                                        }`}
                                    >
                                        {activeTab === tab.key && (
                                            <motion.div
                                                layoutId="activeTabIndicator"
                                                className="absolute inset-0 bg-accent/10 border border-accent/20 rounded-lg -z-10"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        )}
                                        <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? 'text-accent' : ''}`} />
                                        {tab.label}
                                    </button>
                                ))}

                                {/* Online indicator */}
                                <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5">
                                    <div className="flex items-center gap-2 px-3 text-xs text-muted-foreground/80 font-medium">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        3 online
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Tabs */}
                            <div className="md:hidden flex border-b border-border bg-surface/50">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                                            activeTab === tab.key
                                                ? "text-accent border-b-2 border-accent"
                                                : "text-muted-foreground"
                                        }`}
                                    >
                                        <tab.icon className="w-3.5 h-3.5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                                    transition={{ duration: 0.3 }}
                                    className="flex-1 flex relative overflow-hidden"
                                >
                                    {activeTab === "docs" && <DocsView />}
                                    {activeTab === "kanban" && <KanbanView />}
                                    {activeTab === "chat" && <ChatView />}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                {/* Feature Chips */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap justify-center gap-3 mt-12"
                >
                    {[
                        "Real-time cursors",
                        "Live presence",
                        "Instant sync",
                        "Version history",
                        "Drag & drop",
                    ].map((feature, i) => (
                        <motion.span
                            key={feature}
                            whileHover={{ scale: 1.05 }}
                            className="px-4 py-2 rounded-full bg-card/60 backdrop-blur-md border border-border text-sm font-medium text-muted-foreground hover:border-accent hover:text-foreground hover:shadow-[0_0_15px_rgba(var(--accent),0.5)] transition-all cursor-default"
                        >
                            {feature}
                        </motion.span>
                    ))}
                </motion.div>
            </div>
            
            {/* Needs this to enable 3D perspective */}
            <style jsx>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>
        </section>
    );
}
