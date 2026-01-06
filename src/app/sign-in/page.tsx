// src/app/sign-in/page.tsx
"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Zap, Users } from "lucide-react";
import Logo from "@/components/ui/Logo";

const features = [
    { icon: Zap, text: "Real-time collaboration" },
    { icon: Users, text: "Team workspaces" },
    { icon: Shield, text: "Enterprise security" },
];

export default function SignInPage() {
    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Background */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: "linear-gradient(135deg, hsl(221 83% 53%) 0%, hsl(250 80% 50%) 100%)",
                    }}
                />

                {/* Pattern Overlay */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 text-white">
                    <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to home
                    </Link>

                    <div className="space-y-8">
                        <div>
                            <h1 className="text-4xl font-bold mb-4">
                                Start collaborating<br />in seconds
                            </h1>
                            <p className="text-lg text-white/70 max-w-md">
                                Join thousands of teams using CollabFlow to build, ship, and collaborate faster.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {features.map((feature) => (
                                <div key={feature.text} className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                        <feature.icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium">{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-sm text-white/50">
                        © {new Date().getFullYear()} CollabFlow. Open source under MIT.
                    </p>
                </div>

                {/* Decorative circles */}
                <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-white/5" />
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
            </div>

            {/* Right Panel - Sign In Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm"
                >
                    {/* Mobile Back Link */}
                    <Link
                        href="/"
                        className="lg:hidden inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to home
                    </Link>

                    {/* Logo */}
                    <div className="mb-8">
                        <Logo size="lg" />
                    </div>

                    {/* Heading */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
                        <p className="text-muted-foreground">
                            Sign in to continue to your workspace
                        </p>
                    </div>

                    {/* Sign In Button */}
                    <button
                        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border border-border bg-card hover:bg-surface transition-colors text-base font-medium"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground uppercase">or</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* GitHub Button */}
                    <button
                        onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-base font-medium"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        Continue with GitHub
                    </button>

                    {/* Terms */}
                    <p className="text-center text-xs text-muted-foreground mt-8 leading-relaxed">
                        By continuing, you agree to our{" "}
                        <Link href="#" className="underline hover:text-foreground">
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="#" className="underline hover:text-foreground">
                            Privacy Policy
                        </Link>
                    </p>

                    {/* Sign Up Link */}
                    <p className="text-center text-sm text-muted-foreground mt-6">
                        New to CollabFlow?{" "}
                        <Link href="/sign-in" className="font-medium text-accent hover:underline">
                            Create an account
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
