import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDiceBearAvatar } from "@/lib/avatar-colors";
import { cn } from "@/lib/utils";

export type UserStatus = "AVAILABLE" | "BUSY" | "DND" | "BRB" | "AWAY" | "OFFLINE";

interface UserAvatarProps {
    user: {
        name?: string | null;
        image?: string | null;
        status?: string | null; // Database maps to UserStatus, but can be string from frontend
    };
    className?: string; // For Avatar size
    showStatus?: boolean; // Whether to show the bottom-right status dot
}

export function getStatusColor(status?: string | null) {
    if (!status) return "bg-gray-400"; // Default offline
    switch (status.toUpperCase()) {
        case "AVAILABLE": return "bg-green-500";
        case "BUSY": return "bg-red-500";
        case "DND": return "bg-red-600 flex items-center justify-center after:content-['-'] after:text-white after:font-bold after:text-[10px] after:leading-none";
        case "BRB": return "bg-yellow-500";
        case "AWAY": return "bg-yellow-500";
        case "OFFLINE": return "bg-gray-500 after:content-['x'] after:text-white after:font-bold after:text-[8px] flex items-center justify-center";
        default: return "bg-green-500";
    }
}

export function UserAvatar({ user: rawUser, className, showStatus = true }: UserAvatarProps) {
    const user = rawUser ?? { name: null, image: null };
    const diceBearUrl = getDiceBearAvatar(user.name);
    const [imgSrc, setImgSrc] = useState(user.image || diceBearUrl);
    const [hasFailed, setHasFailed] = useState(false);
    const initial = user.name?.[0]?.toUpperCase() || "U";
    const statusColor = getStatusColor(user.status);

    // Reset src when user.image prop changes
    React.useEffect(() => {
        setImgSrc(user.image || diceBearUrl);
        setHasFailed(false);
    }, [user.image, diceBearUrl]);

    return (
        <div className="relative inline-block">
            <Avatar className={cn("h-8 w-8", className)}>
                <AvatarImage
                    src={imgSrc}
                    alt={user.name || "User"}
                    onLoadingStatusChange={(status) => {
                        if (status === "error" && !hasFailed) {
                            setHasFailed(true);
                            setImgSrc(diceBearUrl);
                        }
                    }}
                />
                <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
                    {initial}
                </AvatarFallback>
            </Avatar>
            
            {showStatus && (
                <div
                    className={cn(
                        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                        statusColor
                    )}
                    style={{
                        transform: "translate(10%, 10%)"
                    }}
                />
            )}
        </div>
    );
}

