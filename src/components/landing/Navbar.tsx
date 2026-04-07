// src/components/landing/Navbar.tsx
"use client";

import { useState, useEffect } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { Menu, X, Moon, Sun, Github } from "lucide-react";
import Logo from "@/components/ui/Logo";

const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { setTheme, resolvedTheme } = useTheme();
    const { status } = useSession();
    const isLoggedIn = status === "authenticated";
    const isDark = mounted && resolvedTheme === "dark";

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <LazyMotion features={domAnimation}>
        <>
            <m.header
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                    ? "py-3 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm"
                    : "py-5 bg-transparent"
                    }`}
            >
                <nav className="max-w-6xl mx-auto px-6 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/">
                        <Logo size="sm" />
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {/* GitHub */}
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors"
                            aria-label="GitHub"
                        >
                            <Github className="w-4 h-4" />
                        </a>

                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(isDark ? "light" : "dark")}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors"
                            aria-label="Toggle theme"
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>

                        {/* CTA */}
                        <Link
                            href={isLoggedIn ? "/dashboard" : "/sign-in"}
                            className="hidden sm:inline-flex btn-glow px-4 py-2 rounded-lg text-sm"
                        >
                            {isLoggedIn ? "Dashboard" : "Get Started"}
                        </Link>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </button>
                    </div>
                </nav>
            </m.header>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <m.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-x-0 top-16 z-40 md:hidden"
                    >
                        <div className="mx-4 p-4 rounded-2xl bg-card border border-border shadow-lg">
                            <div className="flex flex-col gap-2">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.label}
                                        href={link.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="px-4 py-3 rounded-lg text-sm font-medium hover:bg-surface transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                                <hr className="border-border my-2" />
                                <Link
                                    href={isLoggedIn ? "/dashboard" : "/sign-in"}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="btn-glow px-4 py-3 rounded-lg text-sm text-center"
                                >
                                    {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
                                </Link>
                            </div>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </>
        </LazyMotion>
    );
}
