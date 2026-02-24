// src/app/sign-in/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Zap, Users, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Logo from "@/components/ui/Logo";

const features = [
    { icon: Zap, text: "Real-time collaboration" },
    { icon: Users, text: "Team workspaces" },
    { icon: Shield, text: "Enterprise security" },
];

export default function SignInPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isCredentialsLoading, setIsCredentialsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError("");
        try {
            await signIn("google", { callbackUrl: "/dashboard" });
        } catch {
            setError("Failed to sign in with Google");
            setIsLoading(false);
        }
    };

    const handleCredentialsSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCredentialsLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password");
            } else {
                window.location.href = "/dashboard";
            }
        } catch {
            setError("Failed to sign in");
        } finally {
            setIsCredentialsLoading(false);
        }
    };

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
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
                        <p className="text-muted-foreground">
                            Sign in to continue to your workspace
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {/* Credentials Form */}
                    <form onSubmit={handleCredentialsSignIn} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isCredentialsLoading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                        >
                            {isCredentialsLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Sign in"
                            )}
                        </button>
                    </form>

                    {/* Google OAuth — commented out for FOSS compliance
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground uppercase">or</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-border bg-card hover:bg-surface transition-colors font-medium disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">...</svg>
                                Continue with Google
                            </>
                        )}
                    </button>
                    */}

                    {/* Terms */}
                    <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
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
                        <Link href="/sign-up" className="font-medium text-accent hover:underline">
                            Create an account
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
