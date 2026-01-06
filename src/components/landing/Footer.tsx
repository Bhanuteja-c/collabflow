// src/components/landing/Footer.tsx
"use client";

import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";
import Logo from "@/components/ui/Logo";

const footerLinks = {
    product: [
        { label: "Features", href: "#features" },
        { label: "Pricing", href: "#pricing" },
        { label: "Documentation", href: "#docs" },
        { label: "Changelog", href: "#changelog" },
    ],
    company: [
        { label: "About", href: "#about" },
        { label: "Blog", href: "#blog" },
        { label: "Careers", href: "#careers" },
        { label: "Contact", href: "#contact" },
    ],
    resources: [
        { label: "Community", href: "#community" },
        { label: "Help Center", href: "#help" },
        { label: "Status", href: "#status" },
    ],
    legal: [
        { label: "Privacy", href: "#privacy" },
        { label: "Terms", href: "#terms" },
        { label: "Security", href: "#security" },
    ],
};

const socialLinks = [
    { icon: Github, href: "https://github.com", label: "GitHub" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
];

export default function Footer() {
    return (
        <footer className="relative border-t border-border bg-background">
            {/* Gradient Line */}
            <div
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
            />

            <div className="max-w-6xl mx-auto px-6 py-16">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-2">
                        <Link href="/" className="inline-block mb-4">
                            <Logo size="sm" />
                        </Link>
                        <p className="text-sm text-muted-foreground max-w-xs mb-4">
                            The open-source collaboration platform for teams who ship fast.
                        </p>

                        {/* Newsletter */}
                        <form className="flex gap-2 mb-4" onSubmit={(e) => e.preventDefault()}>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-1 px-4 py-2 text-sm rounded-lg border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
                            >
                                Subscribe
                            </button>
                        </form>

                        <div className="flex gap-2">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-9 h-9 rounded-lg border border-border hover:bg-surface hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all focus-ring"
                                    aria-label={social.label}
                                >
                                    <social.icon className="w-4 h-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold text-sm mb-4">Product</h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-sm mb-4">Company</h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-sm mb-4">Resources</h4>
                        <ul className="space-y-3">
                            {footerLinks.resources.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-sm mb-4">Legal</h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} CollabFlow. Open source under MIT License.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            All systems operational
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
