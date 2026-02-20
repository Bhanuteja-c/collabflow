"use client";

import { Bell } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useRouter } from "next/navigation";

function getRelativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
}

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const router = useRouter();

    const handleNotificationClick = async (notif: AppNotification) => {
        if (!notif.isRead) {
            await markAsRead(notif.id);
        }
        if (notif.link) {
            router.push(notif.link);
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 hover:bg-muted/50">
                    <Bell className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white border-2 border-background">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-xl" align="end" sideOffset={8}>
                <div className="flex items-center justify-between p-3 border-b bg-muted/20">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); markAsRead(); }} 
                            className="h-auto p-1 px-2 text-xs text-muted-foreground hover:text-primary"
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
                <ScrollArea className="max-h-[350px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 pb-10 text-center flex flex-col items-center justify-center space-y-3">
                            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                                <Bell className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm text-muted-foreground">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col py-1">
                            {notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`flex items-start gap-3 p-3 text-sm transition-colors cursor-pointer hover:bg-muted/60 border-l-2 ${!notif.isRead ? 'bg-primary/5 border-primary' : 'border-transparent'}`}
                                >
                                    <Avatar className="h-8 w-8 mt-0.5 border">
                                        <AvatarImage src={notif.sender?.image || ""} />
                                        <AvatarFallback className="text-[10px] bg-background">
                                            {notif.sender?.name?.[0] || <Bell className="h-3 w-3" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1 overflow-hidden">
                                        <p className="text-xs text-foreground cursor-pointer leading-tight">
                                            <span className="font-semibold">{notif.sender?.name || 'System'}</span>{" "}
                                            {notif.message}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {getRelativeTime(notif.createdAt)}
                                        </p>
                                    </div>
                                    {!notif.isRead && (
                                        <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
