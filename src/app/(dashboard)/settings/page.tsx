// src/app/(dashboard)/settings/page.tsx
"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    User,
    Bell,
    Palette,
    Shield,
    Monitor,
    Moon,
    Sun,
    Save,
    LogOut,
    Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
    const { data: session } = useSession();
    const { theme, setTheme } = useTheme();
    const [saving, setSaving] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const [notifications, setNotifications] = useState({
        email: true,
        push: false,
        updates: true,
    });

    const handleSignOut = async () => {
        setSigningOut(true);
        await signOut({ callbackUrl: "/" });
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        // Simulate save - in real app, this would update the user in DB
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSaving(false);
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
        },
    };

    const item = {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-6"
            >
                {/* Header */}
                <motion.div variants={item}>
                    <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your account preferences
                    </p>
                </motion.div>

                {/* Profile Section */}
                <motion.div variants={item}>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-muted-foreground" />
                                <CardTitle className="text-lg">Profile</CardTitle>
                            </div>
                            <CardDescription>
                                Your personal information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src={session?.user?.image || ""} />
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                                        {session?.user?.name?.[0]?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{session?.user?.name || "User"}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {session?.user?.email || "No email"}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Display name</Label>
                                    <Input
                                        id="name"
                                        defaultValue={session?.user?.name || ""}
                                        placeholder="Your name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        defaultValue={session?.user?.email || ""}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Email is managed by your OAuth provider
                                    </p>
                                </div>
                            </div>

                            <Button onClick={handleSaveProfile} disabled={saving}>
                                {saving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Save changes
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Appearance Section */}
                <motion.div variants={item}>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Palette className="w-5 h-5 text-muted-foreground" />
                                <CardTitle className="text-lg">Appearance</CardTitle>
                            </div>
                            <CardDescription>
                                Customize how CollabFlow looks
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => setTheme("light")}
                                    className={`p-4 rounded-lg border-2 transition-all ${theme === "light"
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-muted-foreground/30"
                                        }`}
                                >
                                    <Sun className="w-5 h-5 mx-auto mb-2" />
                                    <p className="text-sm font-medium">Light</p>
                                </button>
                                <button
                                    onClick={() => setTheme("dark")}
                                    className={`p-4 rounded-lg border-2 transition-all ${theme === "dark"
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-muted-foreground/30"
                                        }`}
                                >
                                    <Moon className="w-5 h-5 mx-auto mb-2" />
                                    <p className="text-sm font-medium">Dark</p>
                                </button>
                                <button
                                    onClick={() => setTheme("system")}
                                    className={`p-4 rounded-lg border-2 transition-all ${theme === "system"
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-muted-foreground/30"
                                        }`}
                                >
                                    <Monitor className="w-5 h-5 mx-auto mb-2" />
                                    <p className="text-sm font-medium">System</p>
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Notifications Section */}
                <motion.div variants={item}>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-muted-foreground" />
                                <CardTitle className="text-lg">Notifications</CardTitle>
                            </div>
                            <CardDescription>
                                Configure how you receive notifications
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Email notifications</p>
                                    <p className="text-xs text-muted-foreground">
                                        Receive updates via email
                                    </p>
                                </div>
                                <Switch
                                    checked={notifications.email}
                                    onCheckedChange={(checked) =>
                                        setNotifications({ ...notifications, email: checked })
                                    }
                                />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Push notifications</p>
                                    <p className="text-xs text-muted-foreground">
                                        Browser push notifications
                                    </p>
                                </div>
                                <Switch
                                    checked={notifications.push}
                                    onCheckedChange={(checked) =>
                                        setNotifications({ ...notifications, push: checked })
                                    }
                                />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Product updates</p>
                                    <p className="text-xs text-muted-foreground">
                                        News about new features
                                    </p>
                                </div>
                                <Switch
                                    checked={notifications.updates}
                                    onCheckedChange={(checked) =>
                                        setNotifications({ ...notifications, updates: checked })
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Security/Account Section */}
                <motion.div variants={item}>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-muted-foreground" />
                                <CardTitle className="text-lg">Account</CardTitle>
                            </div>
                            <CardDescription>
                                Manage your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Sign out</p>
                                    <p className="text-xs text-muted-foreground">
                                        Sign out of your account on this device
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSignOut}
                                    disabled={signingOut}
                                >
                                    {signingOut ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <LogOut className="w-4 h-4 mr-2" />
                                    )}
                                    Sign out
                                </Button>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm text-red-500">Delete account</p>
                                    <p className="text-xs text-muted-foreground">
                                        Permanently delete your account and data
                                    </p>
                                </div>
                                <Button variant="destructive" size="sm" disabled>
                                    Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    );
}
