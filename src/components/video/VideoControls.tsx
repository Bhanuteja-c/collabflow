
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    MonitorUp, MonitorOff, Smile, MessageSquare, Users,
    MoreVertical, Settings, Sparkles
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VideoControlsProps {
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    isBlurEnabled: boolean;
    showChat: boolean;
    showParticipants: boolean;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare: () => void;
    onToggleBlur: () => void;
    onToggleChat: () => void;
    onToggleParticipants: () => void;
    onToggleReactions: () => void;
    onLeave: () => void;
    onOpenSettings?: () => void;
}

export function VideoControls({
    isMuted,
    isVideoOff,
    isScreenSharing,
    isBlurEnabled,
    showChat,
    showParticipants,
    onToggleMute,
    onToggleVideo,
    onToggleScreenShare,
    onToggleBlur,
    onToggleChat,
    onToggleParticipants,
    onToggleReactions,
    onLeave,
    onOpenSettings
}: VideoControlsProps) {
    return (
        <div className="flex items-center justify-center p-4">
            <div className="flex items-center gap-2 px-6 py-3 bg-background/90 backdrop-blur-md rounded-full shadow-2xl border border-border transition-all hover:bg-background/95">
                <TooltipProvider delayDuration={0}>
                    {/* Audio */}
                    <ControlTooltip content={isMuted ? "Unmute" : "Mute"}>
                        <Button
                            variant={isMuted ? "destructive" : "secondary"}
                            size="icon"
                            className="rounded-full h-10 w-10 sm:h-12 sm:w-12 transition-all duration-200"
                            onClick={onToggleMute}
                        >
                            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </Button>
                    </ControlTooltip>

                    {/* Video */}
                    <ControlTooltip content={isVideoOff ? "Start Video" : "Stop Video"}>
                        <Button
                            variant={isVideoOff ? "destructive" : "secondary"}
                            size="icon"
                            className="rounded-full h-10 w-10 sm:h-12 sm:w-12 transition-all duration-200"
                            onClick={onToggleVideo}
                        >
                            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                        </Button>
                    </ControlTooltip>

                    <div className="w-px h-8 bg-border mx-1 hidden sm:block" />

                    {/* Screen Share */}
                    <ControlTooltip content={isScreenSharing ? "Stop Sharing" : "Share Screen"}>
                        <Button
                            variant={isScreenSharing ? "default" : "ghost"}
                            size="icon"
                            className={cn(
                                "rounded-full h-10 w-10 sm:h-12 sm:w-12 hidden sm:flex",
                                isScreenSharing ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                            onClick={onToggleScreenShare}
                        >
                            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
                        </Button>
                    </ControlTooltip>

                    {/* Effects (Blur) */}
                    <ControlTooltip content="Virtual Background">
                        <Button
                            variant={isBlurEnabled ? "default" : "ghost"}
                            size="icon"
                            className={cn(
                                "rounded-full h-10 w-10 sm:h-12 sm:w-12 hidden sm:flex",
                                isBlurEnabled ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                            onClick={onToggleBlur}
                            disabled={isVideoOff}
                        >
                            <Sparkles className="h-5 w-5" />
                        </Button>
                    </ControlTooltip>

                    {/* Reactions */}
                    <ControlTooltip content="Reactions">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground hover:text-foreground hover:bg-accent hidden sm:flex"
                            onClick={onToggleReactions}
                        >
                            <Smile className="h-5 w-5" />
                        </Button>
                    </ControlTooltip>

                    <div className="w-px h-8 bg-border mx-1 hidden sm:block" />

                    {/* Chat */}
                    <ControlTooltip content="Chat">
                        <Button
                            variant={showChat ? "default" : "ghost"}
                            size="icon"
                            className={cn(
                                "rounded-full h-10 w-10 sm:h-12 sm:w-12 hidden sm:flex relative",
                                showChat ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                            onClick={onToggleChat}
                        >
                            <MessageSquare className="h-5 w-5" />
                        </Button>
                    </ControlTooltip>

                    {/* More Menu (Mobile friendly) */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground hover:text-foreground hover:bg-accent sm:hidden"
                            >
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onToggleScreenShare}>
                                <MonitorUp className="mr-2 h-4 w-4" />
                                <span>{isScreenSharing ? "Stop Sharing" : "Share Screen"}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onToggleBlur}>
                                <Sparkles className="mr-2 h-4 w-4" />
                                <span>{isBlurEnabled ? "Disable Blur" : "Enable Blur"}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onToggleReactions}>
                                <Smile className="mr-2 h-4 w-4" />
                                <span>Reactions</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onToggleChat}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                <span>Chat</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onOpenSettings}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Settings (Desktop) */}
                    <ControlTooltip content="Settings">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground hover:text-foreground hover:bg-accent hidden sm:flex"
                            onClick={onOpenSettings}
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                    </ControlTooltip>

                    {/* Leave */}
                    <ControlTooltip content="Leave Call">
                        <Button
                            variant="destructive"
                            size="icon"
                            className="rounded-full h-10 w-10 sm:h-12 sm:w-12 ml-2 hover:bg-red-600"
                            onClick={onLeave}
                        >
                            <PhoneOff className="h-5 w-5" />
                        </Button>
                    </ControlTooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}

function ControlTooltip({ children, content }: { children: React.ReactNode; content: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent>
                <p>{content}</p>
            </TooltipContent>
        </Tooltip>
    );
}
