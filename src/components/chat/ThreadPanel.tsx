import React, { useState, useEffect, useRef } from "react";
import { X, Send, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useSharedSocket } from "@/components/providers/SocketProvider";
import { MessageContent } from "./MessageContent";
import { AttachmentPreview } from "./AttachmentPreview";

interface ThreadPanelProps {
  parentMessage: any;
  channelId: string;
  workspaceSlug: string;
  onClose: () => void;
  currentUser: any;
}

export function ThreadPanel({
  parentMessage,
  channelId,
  workspaceSlug,
  onClose,
  currentUser,
}: ThreadPanelProps) {
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { socket } = useSharedSocket();

  // Load initial replies
  useEffect(() => {
    let active = true;
    const fetchReplies = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/messages?channelId=${channelId}&parentId=${parentMessage.id}&take=50`
        );
        if (res.ok && active) {
          const data = await res.json();
          const messages = Array.isArray(data) ? data : data.messages || [];
          setReplies(messages.reverse());
          
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }
      } catch (err) {
        console.error("Failed to load thread replies:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchReplies();
    return () => {
      active = false;
    };
  }, [channelId, parentMessage.id]);

  // Handle incoming live replies
  useEffect(() => {
    if (!socket) return;
    
    // The main chat emits 'thread-reply' with the child message
    const handleThreadReply = (newReply: any) => {
      if (newReply.parentId === parentMessage.id) {
        setReplies((prev) => {
          if (prev.find((r) => r.id === newReply.id)) return prev;
          return [...prev, newReply];
        });
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }
    };
    
    socket.on("thread-reply", handleThreadReply);
    return () => {
      socket.off("thread-reply", handleThreadReply);
    };
  }, [socket, parentMessage.id]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;
    setSending(true);
    
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: inputValue.trim(),
          channelId,
          parentId: parentMessage.id,
          workspaceSlug,
          clientId: crypto.randomUUID(),
        }),
      });
      
      if (res.ok) {
        setInputValue("");
      }
    } catch (err) {
      console.error("Failed to post reply:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l w-[400px] shadow-xl relative z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Thread</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        {/* Parent Message Context */}
        <div className="p-4 border-b bg-muted/5">
          <div className="flex gap-3">
            <UserAvatar user={{ name: parentMessage.author?.name, image: parentMessage.author?.image }} className="w-8 h-8" showStatus={false} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{parentMessage.author?.name || "Unknown"}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(parentMessage.createdAt), "h:mm a")}
                </span>
              </div>
              <div className="mt-1 text-sm text-foreground">
                <MessageContent content={parentMessage.content} />
              </div>
              {parentMessage.attachments?.length > 0 && (
                <div className="mt-2 grid gap-2">
                  <AttachmentPreview attachments={parentMessage.attachments} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reply Count Divider */}
        <div className="flex items-center px-4 py-3">
          <div className="flex-1 h-px bg-border"></div>
          <span className="px-3 text-xs font-semibold text-muted-foreground">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </span>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        {/* Replies */}
        <div className="px-4 pb-4 space-y-4">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            replies.map((reply) => (
              <div key={reply.id} className="flex gap-3 group">
                <UserAvatar user={{ name: reply.author?.name, image: reply.author?.image }} className="w-8 h-8" showStatus={false} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{reply.author?.name || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(reply.createdAt), "h:mm a")}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-foreground">
                    <MessageContent content={reply.content} />
                  </div>
                  {reply.attachments?.length > 0 && (
                    <div className="mt-2 grid gap-2">
                      <AttachmentPreview attachments={reply.attachments} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reply Input */}
      <div className="p-4 bg-background border-t">
        <div className="relative">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply..."
            className="min-h-[44px] max-h-[150px] pr-12 resize-none py-3"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            className="absolute right-1 bottom-1 h-8 w-8 rounded-sm shrink-0"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
