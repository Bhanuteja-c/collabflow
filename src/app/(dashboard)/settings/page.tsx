// src/app/(dashboard)/settings/page.tsx
"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
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
} from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const [notifications, setNotifications] = useState({
        email: true,
        push: false,
        updates: true,
    });

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
                                    <AvatarImage src="" />
                                    <AvatarFallback className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xl">
                                        U
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <Button variant="outline" size="sm">
                                        Change avatar
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Display name</Label>
                                    <Input id="name" placeholder="Your name" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" placeholder="your@email.com" />
                                </div>
                            </div>

                            <Button className="btn-primary">
                                <Save className="w-4 h-4 mr-2" />
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
                                            ? "border-slate-900 dark:border-white"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                        }`}
                                >
                                    <Sun className="w-5 h-5 mx-auto mb-2" />
                                    <p className="text-sm font-medium">Light</p>
                                </button>
                                <button
                                    onClick={() => setTheme("dark")}
                                    className={`p-4 rounded-lg border-2 transition-all ${theme === "dark"
                                            ? "border-slate-900 dark:border-white"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                        }`}
                                >
                                    <Moon className="w-5 h-5 mx-auto mb-2" />
                                    <p className="text-sm font-medium">Dark</p>
                                </button>
                                <button
                                    onClick={() => setTheme("system")}
                                    className={`p-4 rounded-lg border-2 transition-all ${theme === "system"
                                            ? "border-slate-900 dark:border-white"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
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

                {/* Security Section */}
                <motion.div variants={item}>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-muted-foreground" />
                                <CardTitle className="text-lg">Security</CardTitle>
                            </div>
                            <CardDescription>
                                Manage your account security
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Change password</p>
                                    <p className="text-xs text-muted-foreground">
                                        Update your account password
                                    </p>
                                </div>
                                <Button variant="outline" size="sm">
                                    Update
                                </Button>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Two-factor authentication</p>
                                    <p className="text-xs text-muted-foreground">
                                        Add an extra layer of security
                                    </p>
                                </div>
                                <Button variant="outline" size="sm">
                                    Enable
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    );
}
