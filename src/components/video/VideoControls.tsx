
import React, { useState, forwardRef } from "react";
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    MonitorUp, MonitorOff, Smile, Hand,
    MoreVertical, ChevronUp, Sparkles, Captions, MessageSquare, Users,
    CircleDot, LayoutDashboard, Maximize, PictureInPicture, Phone, MessageSquareWarning, 
    AlertCircle, HelpCircle, Settings, BarChart3, Circle, Pen
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "👏", "🔥", "😮", "🤔"];

interface VideoControlsProps {
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    isBlurEnabled: boolean;
    isHandRaised: boolean;
    isCaptionsOn: boolean;
    activeSidebar: "chat" | "people" | "info" | "host" | null;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare: () => void;
    onToggleBlur: () => void;
    onToggleHandRaise: () => void;
    onToggleCaptions: () => void;
    onToggleChat: () => void;
    onToggleParticipants: () => void;
    onToggleView?: () => void;
    onTogglePiP?: () => void;
    onSendReaction: (reaction: string) => void;
    onLeave: () => void;
    unreadChatCount?: number;
    onOpenSettings?: () => void;
    isRecording?: boolean;
    onToggleRecord?: () => void;
    onOpenPolls?: () => void;
    isNoiseSuppressionOn?: boolean;
    onToggleNoiseSuppression?: () => void;
    onOpenWhiteboard?: () => void;
    isWhiteboardOpen?: boolean;
}

export function VideoControls({
    isMuted,
    isVideoOff,
    isScreenSharing,
    isBlurEnabled,
    isHandRaised,
    isCaptionsOn,
    activeSidebar,
    onToggleMute,
    onToggleVideo,
    onToggleScreenShare,
    onToggleBlur,
    onToggleHandRaise,
    onToggleCaptions,
    onToggleChat,
    onToggleParticipants,
    onToggleView,
    onTogglePiP,
    onSendReaction,
    onLeave,
    unreadChatCount,
    onOpenSettings,
    isRecording,
    onToggleRecord,
    onOpenPolls,
    isNoiseSuppressionOn,
    onToggleNoiseSuppression,
    onOpenWhiteboard,
    isWhiteboardOpen,
}: VideoControlsProps) {
    const [reactionOpen, setReactionOpen] = useState(false);

    const toggleFullScreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error("Failed to toggle full screen", err);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={200}>
                
                {/* ─── Mic Group ─── */}
                <div className="flex items-center">
                    <Tip content="More microphone options">
                        <MeetBtn
                            onClick={() => {}} 
                            className={cn(
                                "w-7 h-10 rounded-l-full rounded-r-none border-r border-[#5f6368]/40",
                                isMuted ? "bg-[#ea4335] hover:bg-[#d33426] border-white/20" : "bg-[#3c4043] hover:bg-[#4a4d51]"
                            )}
                        >
                            <ChevronUp className="w-3.5 h-3.5 text-white" />
                        </MeetBtn>
                    </Tip>
                    <Tip content={isMuted ? "Turn on microphone (Ctrl+D)" : "Turn off microphone (Ctrl+D)"}>
                        <MeetBtn
                            onClick={onToggleMute}
                            className={cn(
                                "w-10 h-10 rounded-r-full rounded-l-none",
                                isMuted ? "bg-[#ea4335] hover:bg-[#d33426]" : "bg-[#3c4043] hover:bg-[#4a4d51]"
                            )}
                        >
                            {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                        </MeetBtn>
                    </Tip>
                </div>

                {/* ─── Video Group ─── */}
                <div className="flex items-center">
                    <Tip content="More camera options">
                        <MeetBtn
                            onClick={() => {}}
                            className={cn(
                                "w-7 h-10 rounded-l-full rounded-r-none border-r border-[#5f6368]/40",
                                isVideoOff ? "bg-[#ea4335] hover:bg-[#d33426] border-white/20" : "bg-[#3c4043] hover:bg-[#4a4d51]"
                            )}
                        >
                            <ChevronUp className="w-3.5 h-3.5 text-white" />
                        </MeetBtn>
                    </Tip>
                    <Tip content={isVideoOff ? "Turn on camera (Ctrl+E)" : "Turn off camera (Ctrl+E)"}>
                        <MeetBtn
                            onClick={onToggleVideo}
                            className={cn(
                                "w-10 h-10 rounded-r-full rounded-l-none",
                                isVideoOff ? "bg-[#ea4335] hover:bg-[#d33426]" : "bg-[#3c4043] hover:bg-[#4a4d51]"
                            )}
                        >
                            {isVideoOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
                        </MeetBtn>
                    </Tip>
                </div>

                {/* ─── Reactions ─── */}
                <Popover open={reactionOpen} onOpenChange={setReactionOpen}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                                <MeetBtn className="w-10 h-10 rounded-full bg-[#3c4043] hover:bg-[#4a4d51] flex">
                                    <Smile className="w-5 h-5 text-white" />
                                </MeetBtn>
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2d2e30] text-[#e8eaed] border-[#5f6368] text-xs px-3 py-1.5 rounded-md">
                            <p>Send a reaction</p>
                        </TooltipContent>
                    </Tooltip>
                    <PopoverContent side="top" className="w-auto p-2 bg-[#2d2e30] border-[#5f6368] rounded-2xl shadow-2xl" sideOffset={12}>
                        <div className="flex gap-0.5">
                            {REACTION_EMOJIS.map(emoji => (
                                <button key={emoji} className="text-2xl p-2 rounded-xl hover:bg-[#3c4043] active:scale-90 transition-all cursor-pointer"
                                    onClick={() => { onSendReaction(emoji); setReactionOpen(false); }}>{emoji}</button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* ─── Screen Share ─── */}
                <Tip content={isScreenSharing ? "Stop presenting" : "Present now"}>
                    <MeetBtn
                        onClick={onToggleScreenShare}
                        className={cn(
                            "w-10 h-10 rounded-full flex",
                            isScreenSharing ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]" : "bg-[#3c4043] hover:bg-[#4a4d51]"
                        )}
                    >
                        {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5 text-white" />}
                    </MeetBtn>
                </Tip>
                
                {/* ─── Captions ─── */}
                <Tip content={isCaptionsOn ? "Turn off captions" : "Turn on captions"}>
                    <MeetBtn
                        onClick={onToggleCaptions}
                        className={cn(
                            "w-10 h-10 rounded-full flex",
                            isCaptionsOn ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]" : "bg-[#3c4043] hover:bg-[#4a4d51]"
                        )}
                    >
                        <Captions className={cn("w-5 h-5", !isCaptionsOn && "text-white")} />
                    </MeetBtn>
                </Tip>

                {/* ─── Hand Raise ─── */}
                <Tip content={isHandRaised ? "Lower hand" : "Raise hand"}>
                    <MeetBtn
                        onClick={onToggleHandRaise}
                        className={cn(
                            "w-10 h-10 rounded-full flex",
                            isHandRaised ? "bg-[#fdd663] text-[#202124] hover:bg-[#fde293]" : "bg-[#3c4043] hover:bg-[#4a4d51]"
                        )}
                    >
                        <Hand className={cn("w-5 h-5", !isHandRaised && "text-white")} />
                    </MeetBtn>
                </Tip>

                {/* ─── More Options (Three Dots) ─── */}
                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <MeetBtn className="w-10 h-10 rounded-full bg-[#3c4043] hover:bg-[#4a4d51] flex outline-none ring-0">
                                    <MoreVertical className="w-5 h-5 text-white" />
                                </MeetBtn>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#2d2e30] text-[#e8eaed] border-[#5f6368] text-xs px-3 py-1.5 rounded-md">
                            <p>More options</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <DropdownMenuContent align="center" side="top" sideOffset={12} className="w-80 bg-[#2d2e30] border-[#5f6368] text-[#e8eaed] rounded-xl z-50 overflow-hidden shadow-2xl py-2">
                        {/* Recording (Disabled) */}
                        <div className="px-5 py-2.5 opacity-50 flex items-center gap-4 hover:bg-[#3c4043] transition-colors select-none">
                            <CircleDot className="w-5 h-5 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Recording unavailable</span>
                                <span className="text-xs text-[#9aa0a6]">You're not allowed to record this video call</span>
                            </div>
                        </div>

                        <DropdownMenuSeparator className="bg-[#5f6368]/30 my-1" />

                        <DropdownMenuItem onClick={onToggleView} className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                            <LayoutDashboard className="w-5 h-5" />
                            <span className="text-sm">Adjust view</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={toggleFullScreen} className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none text-sm">
                            <Maximize className="w-5 h-5" />
                            <span className="text-sm">Full screen</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={onTogglePiP} className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none text-sm">
                            <PictureInPicture className="w-5 h-5" />
                            <span className="text-sm">Open picture-in-picture</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={onToggleBlur} className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                            <Sparkles className="w-5 h-5 text-[#8ab4f8]" />
                            <span className="text-sm">{isBlurEnabled ? "Disable backgrounds & effects" : "Backgrounds and effects"}</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                            <Phone className="w-5 h-5" />
                            <span className="text-sm">Use a phone for audio</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={onToggleNoiseSuppression} className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                            <Mic className={cn("w-5 h-5", isNoiseSuppressionOn && "text-[#8ab4f8]")} />
                            <span className="text-sm">{isNoiseSuppressionOn ? "Disable noise suppression" : "Noise suppression"}</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-[#5f6368]/30 my-1" />

                        <DropdownMenuItem onClick={onToggleRecord} className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                            <Circle className={cn("w-5 h-5", isRecording && "text-[#ea4335] fill-[#ea4335] animate-pulse")} />
                            <span className="text-sm">{isRecording ? "Stop recording" : "Record meeting"}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={onOpenPolls} className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                            <BarChart3 className="w-5 h-5" />
                            <span className="text-sm">Polls</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={onOpenWhiteboard} className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                            <Pen className={cn("w-5 h-5", isWhiteboardOpen && "text-[#8ab4f8]")} />
                            <span className="text-sm">{isWhiteboardOpen ? "Close whiteboard" : "Open whiteboard"}</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-[#5f6368]/30 my-1" />

                        <DropdownMenuItem className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                            <MessageSquareWarning className="w-5 h-5" />
                            <span className="text-sm">Report a problem</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm">Report abuse</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                            <HelpCircle className="w-5 h-5" />
                            <span className="text-sm">Troubleshooting & help</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={onOpenSettings} className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                            <Settings className="w-5 h-5" />
                            <span className="text-sm">Settings</span>
                        </DropdownMenuItem>

                        <div className="sm:hidden block">
                            <DropdownMenuSeparator className="bg-[#5f6368]/30 my-1" />
                            <DropdownMenuItem onClick={onToggleChat} className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                                <MessageSquare className="w-5 h-5" />
                                <span className="text-sm">Chat</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onToggleParticipants} className="px-5 hover:bg-[#3c4043] focus:bg-[#3c4043] gap-4 py-2.5 cursor-pointer outline-none">
                                <Users className="w-5 h-5" />
                                <span className="text-sm">People</span>
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* ─── Leave Call ─── */}
                <Tip content="Leave call">
                    <button
                        onClick={onLeave}
                        className="h-10 w-16 rounded-full bg-[#ea4335] hover:bg-[#d33426] text-white flex items-center justify-center transition-colors ml-2"
                    >
                        <PhoneOff className="w-5 h-5" />
                    </button>
                </Tip>

            </TooltipProvider>
        </div>
    );
}

// ─── Google Meet button ───
const MeetBtn = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ children, className, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn("flex items-center justify-center transition-colors cursor-pointer", className)}
                {...props}
            >
                {children}
            </button>
        );
    }
);
MeetBtn.displayName = "MeetBtn";

function Tip({ children, content }: { children: React.ReactNode; content: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="top" className="bg-[#2d2e30] text-[#e8eaed] border-[#5f6368] text-xs px-3 py-1.5 rounded-md">
                <p>{content}</p>
            </TooltipContent>
        </Tooltip>
    );
}
