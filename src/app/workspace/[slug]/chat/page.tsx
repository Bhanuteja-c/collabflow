// src/app/(dashboard)/chat/page.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/hooks/useSocket";
import { MessageContent } from "@/components/chat/MessageContent";
import {
  Plus,
  Send,
  Hash,
  Users,
  Loader2,
  MessageSquare,
  Smile,
  X,
  Menu,
  Pencil,
  Trash2,
  Check,
  Paperclip,
  RefreshCw,
  Reply,
  ArrowLeft,
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AttachmentPreview } from "@/components/chat/AttachmentPreview";

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface Message {
  id: string;
  content: string;
  channelId?: string;
  authorId?: string;
  parentId?: string | null;
  createdAt: string;
  author: User;
  reactions?: any[];
  attachments?: any;
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  isPinned?: boolean;
  status?: "pending" | "sent" | "failed";
  replyCount?: number;
  replies?: { author: User; createdAt: string }[];
}

interface ChannelMember {
  user: User;
  role: string;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: string;
  members: ChannelMember[];
  unreadCount?: number;
}

const EMOJI_LIST = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "💯", "✅"];

function ThreadReplyInput({ onSend }: { onSend: (content: string) => void }) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!value.trim() || sending) return;
    setSending(true);
    const content = value;
    setValue("");
    await onSend(content);
    setSending(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Reply..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        className="flex-1 h-8 text-sm"
      />
      <Button
        onClick={handleSend}
        disabled={!value.trim() || sending}
        size="icon"
        className="h-8 w-8"
      >
        {sending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Send className="w-3 h-3" />
        )}
      </Button>
    </div>
  );
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [fetchedMessages, setFetchedMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<
    { id: string; name: string; image?: string }[]
  >([]);
  const [workspace, setWorkspace] = useState<{
    id: string;
    slug: string;
  } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    type: string;
    url: string;
    name: string;
    size: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const params = useParams();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Thread state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [editContent, setEditContent] = useState("");

  // Pinned messages state
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinnedBar, setShowPinnedBar] = useState(false);

  // Channel description state
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");

  // Current user for presence
  const currentUser = useMemo(() => {
    if (!session?.user?.id) return undefined;
    return {
      id: (session.user as any).id,
      name: session.user.name || "Anonymous",
      image: session.user.image || undefined,
    };
  }, [session?.user]);

  // Socket.io hook with presence
  const {
    connected,
    messages: socketMessages,
    typingUsers,
    onlineUsers,
    sendTyping,
    addMessage,
    updateMessage,
    removeMessage,
  } = useSocket({
    channelId: selectedChannel?.id || null,
    currentUser,
  });

  // Combine fetched messages with socket messages
  const allMessages = [...fetchedMessages, ...socketMessages];

  // Fetch workspace first, then channels
  useEffect(() => {
    const fetchWorkspaceAndChannels = async () => {
      try {
        // First get the workspace by slug
        const slug = params.slug as string;
        const wsRes = await fetch(`/api/workspaces/${slug}`);
        if (!wsRes.ok) {
          console.error("Failed to fetch workspace");
          setLoading(false);
          return;
        }
        const wsData = await wsRes.json();
        setWorkspace({ id: wsData.id, slug: wsData.slug });

        // Then fetch channels for this workspace
        const res = await fetch(`/api/channels?workspaceId=${wsData.id}`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data);
          if (data.length > 0 && !selectedChannel) {
            setSelectedChannel(data[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaceAndChannels();
  }, [params.slug]);

  // Fetch messages when channel changes
  useEffect(() => {
    if (!selectedChannel) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `/api/messages?channelId=${selectedChannel.id}`,
        );
        if (res.ok) {
          const data = await res.json();
          setFetchedMessages(data);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    fetchMessages();
  }, [selectedChannel]);

  // Fetch pinned messages when channel changes
  useEffect(() => {
    if (!selectedChannel) return;
    const fetchPinned = async () => {
      try {
        const res = await fetch(
          `/api/messages?channelId=${selectedChannel.id}`,
        );
        if (res.ok) {
          const data = await res.json();
          setPinnedMessages(data.filter((m: Message) => m.isPinned));
        }
      } catch (e) {
        console.error("Error fetching pinned messages:", e);
      }
    };
    fetchPinned();
  }, [selectedChannel]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, typingUsers]);

  // Pin/unpin message
  const togglePin = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/pin`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        // Update local state
        const updateMsg = (msg: Message) =>
          msg.id === messageId ? { ...msg, isPinned: updated.isPinned } : msg;
        setFetchedMessages((prev) => prev.map(updateMsg));
        updateMessage(messageId, {
          isPinned: updated.isPinned,
        } as Partial<Message>);

        // Refresh pinned list
        if (updated.isPinned) {
          setPinnedMessages((prev) => [
            ...prev,
            { ...updated, channelId: selectedChannel?.id },
          ]);
        } else {
          setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
      }
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  // Toggle emoji reaction
  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        const userId = (session?.user as any)?.id;
        // Update local reactions
        const updateReactions = (msg: Message) => {
          if (msg.id !== messageId) return msg;
          let reactions = [...(msg.reactions || [])];
          if (data.action === "added") {
            reactions.push({
              emoji,
              userId,
              user: { id: userId, name: session?.user?.name },
            });
          } else {
            reactions = reactions.filter(
              (r) => !(r.emoji === emoji && r.userId === userId),
            );
          }
          return { ...msg, reactions };
        };
        setFetchedMessages((prev) => prev.map(updateReactions));
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  // Save channel description
  const saveDescription = async () => {
    if (!selectedChannel) return;
    try {
      const res = await fetch(`/api/channels/${selectedChannel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: descriptionDraft }),
      });
      if (res.ok) {
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === selectedChannel.id
              ? { ...ch, description: descriptionDraft }
              : ch,
          ),
        );
        setSelectedChannel({
          ...selectedChannel,
          description: descriptionDraft,
        });
        setEditingDescription(false);
      }
    } catch (error) {
      console.error("Error saving description:", error);
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !workspace) return;

    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChannelName.trim(),
          workspaceId: workspace.id,
        }),
      });

      if (res.ok) {
        const channel = await res.json();
        setChannels([channel, ...channels]);
        setSelectedChannel(channel);
        setNewChannelName("");
        setShowNewChannel(false);
      }
    } catch (error) {
      console.error("Error creating channel:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || sending) return;

    // Optimistic: immediately show the message in the UI
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMsg: Message = {
      id: tempId,
      content: newMessage.trim(),
      channelId: selectedChannel.id,
      authorId: currentUser?.id || "",
      author: {
        id: currentUser?.id || "",
        name: currentUser?.name || session?.user?.name || "You",
        image: currentUser?.image || session?.user?.image || null,
      },
      createdAt: new Date().toISOString(),
      isEdited: false,
      isDeleted: false,
      reactions: [],
      attachments: pendingAttachment ? [pendingAttachment] : undefined,
      status: "pending",
    } as Message;

    addMessage(optimisticMsg);

    // Clear input immediately — feels instant
    const savedContent = newMessage.trim();
    const savedAttachment = pendingAttachment;
    setNewMessage("");
    setShowEmojiPicker(false);
    setPendingAttachment(null);
    inputRef.current?.focus();

    // Send to server in background
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          content: savedContent,
          attachments: savedAttachment ? [savedAttachment] : undefined,
          parentId: replyingTo?.id || undefined,
        }),
      });

      if (res.ok) {
        // Remove the optimistic message — the real one arrives via socket
        removeMessage(tempId);
      } else {
        // Mark as failed so user can retry
        updateMessage(tempId, { status: "failed" } as Partial<Message>);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      updateMessage(tempId, { status: "failed" } as Partial<Message>);
    } finally {
      setReplyingTo(null);
    }
  };

  // Retry a failed message
  const retryMessage = async (failedMsg: Message) => {
    updateMessage(failedMsg.id, { status: "pending" } as Partial<Message>);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: failedMsg.channelId || selectedChannel?.id,
          content: failedMsg.content,
          attachments: failedMsg.attachments || undefined,
        }),
      });

      if (res.ok) {
        removeMessage(failedMsg.id);
      } else {
        updateMessage(failedMsg.id, { status: "failed" } as Partial<Message>);
      }
    } catch {
      updateMessage(failedMsg.id, { status: "failed" } as Partial<Message>);
    }
  };

  // Open thread panel
  const openThread = async (message: Message) => {
    setActiveThread(message);
    setThreadReplies([]);
    setThreadLoading(true);
    try {
      const res = await fetch(
        `/api/messages?channelId=${message.channelId || selectedChannel?.id}&parentId=${message.id}`,
      );
      if (res.ok) {
        const replies = await res.json();
        setThreadReplies(replies);
      }
    } catch (error) {
      console.error("Error fetching thread:", error);
    } finally {
      setThreadLoading(false);
    }
  };

  // Send a reply in a thread
  const sendThreadReply = async (content: string) => {
    if (!content.trim() || !activeThread || !selectedChannel) return;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          content: content.trim(),
          parentId: activeThread.id,
        }),
      });

      if (res.ok) {
        const reply = await res.json();
        setThreadReplies((prev) => [...prev, reply]);
      }
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };

  const handleTyping = () => {
    if (session?.user) {
      sendTyping((session.user as any).id || "", session.user.name || "");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return (
      date.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const attachment = await res.json();
        setPendingAttachment(attachment);
      } else {
        const error = await res.json();
        alert(error.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Edit message
  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;

    try {
      const res = await fetch(`/api/messages/${editingMessageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (res.ok) {
        // Update local state
        updateMessage(editingMessageId, {
          content: editContent.trim(),
          isEdited: true,
          editedAt: new Date().toISOString(),
        });
        setFetchedMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessageId
              ? { ...m, content: editContent.trim(), isEdited: true }
              : m,
          ),
        );
        cancelEditing();
      }
    } catch (error) {
      console.error("Error editing message:", error);
    }
  };

  // Delete message (soft delete)
  const deleteMessage = async (messageId: string) => {
    if (!confirm("Delete this message?")) return;

    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Update local state with deleted placeholder
        updateMessage(messageId, {
          content: "[This message was deleted]",
          isDeleted: true,
        });
        setFetchedMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, content: "[This message was deleted]", isDeleted: true }
              : m,
          ),
        );
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] bg-background items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Channel List */}
      <div
        className={`
                fixed md:relative inset-y-0 left-0 z-50 md:z-auto
                w-72 md:w-64 border-r flex flex-col bg-muted/30
                transform transition-transform duration-200 ease-in-out
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">Channels</h2>
              {connected && (
                <span
                  className="w-2 h-2 rounded-full bg-emerald-500"
                  title="Connected"
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNewChannel(!showNewChannel)}
              className="h-8 w-8"
            >
              {showNewChannel ? (
                <X className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>

          <AnimatePresence>
            {showNewChannel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Input
                  placeholder="Channel name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createChannel()}
                  className="h-9"
                  autoFocus
                />
                <Button
                  onClick={createChannel}
                  className="w-full h-9"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Channel
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {channels.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No channels yet</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowNewChannel(true)}
                  className="mt-2"
                >
                  Create your first channel
                </Button>
              </div>
            ) : (
              channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => {
                    setSelectedChannel(channel);
                    setSidebarOpen(false);
                    // Clear unread count locally
                    setChannels((prev) =>
                      prev.map((ch) =>
                        ch.id === channel.id ? { ...ch, unreadCount: 0 } : ch,
                      ),
                    );
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                    selectedChannel?.id === channel.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-sm font-medium flex-1">
                    {channel.name}
                  </span>
                  {(channel.unreadCount ?? 0) > 0 &&
                    selectedChannel?.id !== channel.id && (
                      <Badge
                        variant="destructive"
                        className="h-5 min-w-5 px-1.5 text-[10px] font-bold"
                      >
                        {channel.unreadCount! > 99
                          ? "99+"
                          : channel.unreadCount}
                      </Badge>
                    )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="p-4 border-b flex items-center justify-between bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-semibold">{selectedChannel.name}</h1>
                  <p className="text-xs text-muted-foreground">
                    {selectedChannel.members?.length || 0} members
                    {onlineUsers.length > 0 && (
                      <span className="ml-2 text-emerald-500">
                        • {onlineUsers.length + 1} online
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Online users avatars */}
              {onlineUsers.length > 0 && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {onlineUsers.slice(0, 4).map((viewer) => (
                      <Avatar
                        key={viewer.socketId}
                        className="w-7 h-7 border-2 border-background ring-2 ring-emerald-500/30"
                        title={viewer.user.name}
                      >
                        <AvatarImage src={viewer.user.image} />
                        <AvatarFallback className="text-[10px]">
                          {viewer.user.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {onlineUsers.length > 4 && (
                      <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                        +{onlineUsers.length - 4}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Users className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Channel Description */}
            {selectedChannel.description && !editingDescription && (
              <div
                className="px-4 py-2 border-b bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => {
                  setEditingDescription(true);
                  setDescriptionDraft(selectedChannel.description || "");
                }}
              >
                <p className="text-xs text-muted-foreground truncate">
                  📝 {selectedChannel.description}
                </p>
              </div>
            )}
            {editingDescription && (
              <div className="px-4 py-2 border-b bg-muted/20 flex items-center gap-2">
                <Input
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveDescription()}
                  placeholder="Set a channel topic..."
                  className="h-7 text-xs flex-1"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={saveDescription}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditingDescription(false)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            {!selectedChannel.description && !editingDescription && (
              <button
                className="px-4 py-1.5 border-b text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors w-full text-left"
                onClick={() => {
                  setEditingDescription(true);
                  setDescriptionDraft("");
                }}
              >
                + Add a channel topic
              </button>
            )}

            {/* Pinned Messages Bar */}
            {pinnedMessages.length > 0 && (
              <div className="border-b">
                <button
                  onClick={() => setShowPinnedBar(!showPinnedBar)}
                  className="w-full px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
                >
                  <Pin className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-medium">
                    {pinnedMessages.length} pinned message
                    {pinnedMessages.length > 1 ? "s" : ""}
                  </span>
                  {showPinnedBar ? (
                    <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                  )}
                </button>
                <AnimatePresence>
                  {showPinnedBar && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-2 space-y-2 max-h-40 overflow-y-auto">
                        {pinnedMessages.map((pm) => (
                          <div
                            key={pm.id}
                            className="flex items-start gap-2 p-2 bg-amber-500/5 rounded-lg border border-amber-500/20"
                          >
                            <Pin className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-medium">
                                {pm.author.name}
                              </span>
                              <p className="text-xs text-muted-foreground truncate">
                                {pm.content}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 flex-shrink-0"
                              onClick={() => togglePin(pm.id)}
                            >
                              <PinOff className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-1">
                {allMessages.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-medium text-lg mb-1">
                      Welcome to #{selectedChannel.name}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      This is the beginning of the channel. Say hi!
                    </p>
                  </div>
                ) : (
                  allMessages.map((message, i) => {
                    const prevMessage = allMessages[i - 1];
                    const showAvatar =
                      i === 0 || prevMessage?.author.id !== message.author.id;
                    const isOwnMessage =
                      message.author.id === (session?.user as any)?.id;
                    const isEditing = editingMessageId === message.id;

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 group hover:bg-muted/50 rounded-lg px-2 py-1 -mx-2 ${showAvatar ? "mt-4" : ""} ${message.status === "pending" ? "opacity-60" : ""} ${message.status === "failed" ? "border-l-2 border-red-500" : ""}`}
                      >
                        {showAvatar ? (
                          <Avatar className="h-9 w-9 mt-0.5">
                            <AvatarImage src={message.author.image || ""} />
                            <AvatarFallback className="text-xs">
                              {message.author.name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-9" />
                        )}
                        <div className="flex-1 min-w-0">
                          {showAvatar && (
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span className="font-semibold text-sm">
                                {message.author.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(message.createdAt)}
                              </span>
                              {message.isEdited && (
                                <span className="text-xs text-muted-foreground">
                                  (edited)
                                </span>
                              )}
                            </div>
                          )}

                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit();
                                  if (e.key === "Escape") cancelEditing();
                                }}
                                className="flex-1 h-8 text-sm"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={saveEdit}
                              >
                                <Check className="w-4 h-4 text-emerald-500" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={cancelEditing}
                              >
                                <X className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex-1">
                              <div className="flex items-start gap-2">
                                <p
                                  className={`text-sm leading-relaxed break-words flex-1 ${message.isDeleted ? "italic text-muted-foreground" : ""}`}
                                >
                                  {message.isDeleted ? (
                                    message.content
                                  ) : (
                                    <MessageContent
                                      content={message.content}
                                      workspaceMembers={workspaceMembers}
                                    />
                                  )}
                                </p>
                              </div>

                              {/* Attachments */}
                              {message.attachments && (
                                <AttachmentPreview
                                  attachments={message.attachments as any}
                                />
                              )}

                              {/* Failed message retry */}
                              {message.status === "failed" && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-destructive">
                                    Failed to send
                                  </span>
                                  <button
                                    onClick={() => retryMessage(message)}
                                    className="text-xs text-accent hover:underline flex items-center gap-1"
                                  >
                                    <RefreshCw className="w-3 h-3" /> Retry
                                  </button>
                                  <button
                                    onClick={() => removeMessage(message.id)}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              )}

                              {/* Edit/Delete buttons - only for own messages */}
                              {isOwnMessage &&
                                !message.isDeleted &&
                                !message.status && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => startEditing(message)}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                      onClick={() => deleteMessage(message.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}

                              {/* Pin + Reaction + Reply buttons — visible on hover */}
                              {!message.isDeleted && !message.status && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
                                  {/* Quick reactions */}
                                  {["👍", "❤️", "😂", "🎉", "🔥", "👀"].map(
                                    (emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() =>
                                          toggleReaction(message.id, emoji)
                                        }
                                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors text-sm"
                                        title={emoji}
                                      >
                                        {emoji}
                                      </button>
                                    ),
                                  )}
                                  {/* Pin button */}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className={`h-6 w-6 ${message.isPinned ? "text-amber-500" : ""}`}
                                    onClick={() => togglePin(message.id)}
                                    title={message.isPinned ? "Unpin" : "Pin"}
                                  >
                                    {message.isPinned ? (
                                      <PinOff className="w-3 h-3" />
                                    ) : (
                                      <Pin className="w-3 h-3" />
                                    )}
                                  </Button>
                                  {/* Reply button */}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => setReplyingTo(message)}
                                    title="Reply"
                                  >
                                    <Reply className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}

                              {/* Reaction counts display */}
                              {(message.reactions?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Object.entries(
                                    (message.reactions || []).reduce(
                                      (
                                        acc: Record<
                                          string,
                                          {
                                            count: number;
                                            users: string[];
                                            hasOwn: boolean;
                                          }
                                        >,
                                        r: any,
                                      ) => {
                                        if (!acc[r.emoji])
                                          acc[r.emoji] = {
                                            count: 0,
                                            users: [],
                                            hasOwn: false,
                                          };
                                        acc[r.emoji].count++;
                                        acc[r.emoji].users.push(
                                          r.user?.name || "Unknown",
                                        );
                                        if (
                                          r.userId ===
                                          (session?.user as any)?.id
                                        )
                                          acc[r.emoji].hasOwn = true;
                                        return acc;
                                      },
                                      {} as Record<
                                        string,
                                        {
                                          count: number;
                                          users: string[];
                                          hasOwn: boolean;
                                        }
                                      >,
                                    ),
                                  ).map(([emoji, data]) => (
                                    <button
                                      key={emoji}
                                      onClick={() =>
                                        toggleReaction(message.id, emoji)
                                      }
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                        data.hasOwn
                                          ? "bg-primary/10 border-primary/30 text-primary"
                                          : "bg-muted/50 border-border hover:bg-muted"
                                      }`}
                                      title={data.users.join(", ")}
                                    >
                                      <span>{emoji}</span>
                                      <span className="font-medium">
                                        {data.count}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Thread indicator */}
                              {(message.replyCount || 0) > 0 && (
                                <button
                                  onClick={() => openThread(message)}
                                  className="flex items-center gap-1.5 mt-1 text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span className="font-medium">
                                    {message.replyCount}{" "}
                                    {message.replyCount === 1
                                      ? "reply"
                                      : "replies"}
                                  </span>
                                  {message.replies?.[0] && (
                                    <span className="text-muted-foreground">
                                      — Last reply{" "}
                                      {formatTime(message.replies[0].createdAt)}
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <span
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                    <span>
                      {typingUsers.map((u) => u.name).join(", ")}{" "}
                      {typingUsers.length === 1 ? "is" : "are"} typing...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Reply bar */}
            {replyingTo && (
              <div className="px-4 pt-2 pb-0">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-t-lg border border-b-0 text-xs text-muted-foreground">
                  <Reply className="w-3 h-3" />
                  <span>
                    Replying to{" "}
                    <strong className="text-foreground">
                      {replyingTo.author.name}
                    </strong>
                  </span>
                  <span className="truncate max-w-[200px] opacity-70">
                    {replyingTo.content}
                  </span>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="ml-auto hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 relative">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* File picker button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </Button>

                {/* Emoji picker */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 bg-popover border rounded-lg shadow-lg p-2 flex gap-1 z-50">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => addEmoji(emoji)}
                          className="hover:bg-muted p-1 rounded text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending attachment preview */}
                {pendingAttachment && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-sm">
                    <span className="truncate max-w-24">
                      {pendingAttachment.name}
                    </span>
                    <button
                      onClick={() => setPendingAttachment(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <Input
                  ref={inputRef}
                  placeholder={`Message #${selectedChannel.name}`}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && sendMessage()
                  }
                  className="flex-1"
                />

                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="icon"
                  className="h-9 w-9"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="font-semibold text-lg mb-2">
                No channel selected
              </h2>
              <p className="text-muted-foreground text-sm">
                Select a channel or create a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Thread Panel */}
      <AnimatePresence>
        {activeThread && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l bg-card overflow-hidden flex-shrink-0"
          >
            <div className="w-[360px] h-full flex flex-col">
              {/* Thread header */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Thread</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setActiveThread(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Parent message */}
              <div className="px-4 py-3 border-b bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    {activeThread.author.image ? (
                      <img
                        src={activeThread.author.image}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <span className="text-xs font-medium text-primary">
                        {activeThread.author.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {activeThread.author.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(activeThread.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5 break-words">
                      {activeThread.content}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {activeThread.replyCount || 0}{" "}
                  {(activeThread.replyCount || 0) === 1 ? "reply" : "replies"}
                </p>
              </div>

              {/* Thread replies */}
              <ScrollArea className="flex-1">
                <div className="px-4 py-2 space-y-3">
                  {threadLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : threadReplies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No replies yet. Be the first!
                    </div>
                  ) : (
                    threadReplies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {reply.author.image ? (
                            <img
                              src={reply.author.image}
                              alt=""
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <span className="text-[10px] font-medium text-primary">
                              {reply.author.name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs">
                              {reply.author.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatTime(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm break-words">{reply.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Thread reply input */}
              <div className="p-3 border-t">
                <ThreadReplyInput onSend={sendThreadReply} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
