// src/app/(dashboard)/chat/page.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/hooks/useSocket";
import { useSharedSocket } from "@/components/providers/SocketProvider";
import { useWorkspacePresence } from "@/hooks/useWorkspacePresence";
import { MessageContent } from "@/components/chat/MessageContent";
import { MessageTicks } from "@/components/chat/MessageTicks";
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
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp,
  Video,
  ListTodo,
  ArrowDown,
  MoreVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AttachmentPreview } from "@/components/chat/AttachmentPreview";
import { MainChatInput } from "@/components/chat/MainChatInput";
import { avatarFallbackClass } from "@/lib/avatar-colors";

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface Reaction {
  emoji: string;
  userId: string;
  user?: { id: string; name: string | null };
}

interface Attachment {
  type: "image" | "pdf";
  url: string;
  name: string;
  size?: number;
}

interface Message {
  id: string;
  content: string;
  channelId?: string;
  authorId?: string;
  parentId?: string | null;
  createdAt: string;
  author: User;
  reactions?: Reaction[];
  attachments?: Attachment[];
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

function ThreadReplyInput({
  onSend,
  workspaceMembers
}: {
  onSend: (content: string) => void,
  workspaceMembers: { id: string; name: string; image?: string; email?: string }[]
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!value.trim() || sending) return;
    setSending(true);
    const content = value;
    setValue("");
    await onSend(content);
    setSending(false);
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* Mention autocomplete menu */}
      {showMentionMenu && (
        <div className="absolute bottom-10 left-0 w-64 bg-popover border rounded-lg shadow-lg py-1 z-50">
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-b uppercase">
            Members
          </div>
          {workspaceMembers
            .filter((m) =>
              (m.name || "").toLowerCase().includes(mentionSearch),
            )
            .slice(0, 5)
            .map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  const words = value.split(/(?<=\s)/);
                  const lastWordIndex = words.length - 1;
                  const mentionAlias = (member.name || "").replace(/\s+/g, "");
                  words[lastWordIndex] = `@${mentionAlias} `;
                  setValue(words.join(""));
                  setShowMentionMenu(false);
                  inputRef.current?.focus();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-left"
              >
                <Avatar className="h-4 w-4">
                  <AvatarImage src={member.image || ""} />
                  <AvatarFallback className="text-[8px]">
                    {member.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.name}</span>
              </button>
            ))}
        </div>
      )}
      <Input
        ref={inputRef}
        placeholder="Reply..."
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          setValue(val);
          const lastWord = val.split(" ").pop();
          if (lastWord?.startsWith("@")) {
            setShowMentionMenu(true);
            setMentionSearch(lastWord.slice(1).toLowerCase());
          } else {
            setShowMentionMenu(false);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (showMentionMenu) {
              setShowMentionMenu(false);
            } else {
              handleSend();
            }
          }
        }}
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

// Format a date for the separator label
function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [fetchedMessages, setFetchedMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<
    { id: string; name: string; image?: string; email?: string }[]
  >([]);
  const [workspace, setWorkspace] = useState<{
    id: string;
    slug: string;
  } | null>(null);
  const params = useParams();
  const router = useRouter();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrolledUp, setScrolledUp] = useState(false);

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Thread state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [editContent, setEditContent] = useState("");

  // Pinned messages state
  const [showPinnedBar, setShowPinnedBar] = useState(false);

  // Channel description state
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");

  // Current user for presence
  const currentUser = useMemo(() => {
    if (!session?.user?.id) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session.user as any).id as string;
    return {
      id: userId,
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
    readTimestamps,
    sendTyping,
    addMessage,
    updateMessage,
    removeMessage,
  } = useSocket({
    channelId: selectedChannel?.id || null,
    currentUser,
  });

  // Global workspace presence
  const { onlineUsers: workspaceOnlineUsers } = useWorkspacePresence(
    workspace?.id,
  );

  // Combine fetched messages with socket messages (deduplicated)
  const allMessages = useMemo(() => {
    const combined = [...fetchedMessages, ...socketMessages];
    const uniqueMap = new Map();
    combined.forEach((msg) => uniqueMap.set(msg.id, msg));
    return Array.from(uniqueMap.values()).sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [fetchedMessages, socketMessages]);

  // Derive pinned messages from the live allMessages list — no separate fetch needed
  const pinnedMessages = useMemo(
    () => allMessages.filter((m) => m.isPinned),
    [allMessages]
  );

  // Listen for new messages in background channels and increment their unread badge
  const { socket } = useSharedSocket();
  useEffect(() => {
    if (!socket) return;
    const handleChannelNewMessage = (data: { channelId: string; authorId: string }) => {
      // Only increment if it's not the currently open channel
      if (data.channelId === selectedChannel?.id) return;
      // Don't increment if the message was sent by the current user
      if (data.authorId === currentUser?.id) return;
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === data.channelId
            ? { ...ch, unreadCount: (ch.unreadCount ?? 0) + 1 }
            : ch
        )
      );
    };
    socket.on("channel-new-message", handleChannelNewMessage);
    return () => { socket.off("channel-new-message", handleChannelNewMessage); };
  }, [socket, selectedChannel?.id, currentUser?.id]);

  // Live-update the open thread panel when new replies arrive via socket
  useEffect(() => {
    if (!socket) return;
    const handleThreadReply = (reply: Message) => {
      // Only update if the panel is open for the same parent
      if (!activeThread || reply.parentId !== activeThread.id) return;
      setThreadReplies((prev) => {
        if (prev.some((r) => r.id === reply.id)) return prev; // deduplicate
        return [...prev, reply];
      });
      // Also bump the reply count shown in the panel header
      setActiveThread((prev) =>
        prev ? { ...prev, replyCount: (prev.replyCount ?? 0) + 1 } : prev
      );
    };
    socket.on("thread-reply", handleThreadReply);
    return () => { socket.off("thread-reply", handleThreadReply); };
  }, [socket, activeThread?.id]);

  // Fetch workspace first, then channels and members
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

        // Fetch workspace members for Direct Messages list
        const membersRes = await fetch(`/api/workspaces/${slug}/members`);
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mappedMembers = membersData.map((m: any) => m.user);
          setWorkspaceMembers(mappedMembers);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaceAndChannels();
  }, [params.slug]);

  // Handle opening or creating a Direct Message
  const handleDirectMessage = async (targetUserId: string) => {
    if (!workspace?.id) return;

    try {
      const res = await fetch(`/api/channels/direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          workspaceId: workspace.id,
        }),
      });

      if (res.ok) {
        const directChannel = await res.json();

        // Add to channels list if it's not already there
        setChannels((prev) => {
          const exists = prev.find((c) => c.id === directChannel.id);
          if (!exists) return [...prev, directChannel];
          return prev;
        });

        setSelectedChannel(directChannel);
        setSidebarOpen(false);
        setFetchedMessages(directChannel.messages || []);
      } else {
        alert("Failed to start direct message.");
      }
    } catch (error) {
      console.error("Failed to open DM:", error);
      alert("Failed to start direct message.");
    }
  };

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

  // (pinnedMessages is now derived via useMemo from allMessages)

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
        // Update local fetched messages — isPinned drives pinnedMessages via useMemo
        const updateMsg = (msg: Message) =>
          msg.id === messageId ? { ...msg, isPinned: updated.isPinned } : msg;
        setFetchedMessages((prev) => prev.map(updateMsg));
        updateMessage(messageId, { isPinned: updated.isPinned } as Partial<Message>);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session?.user as any)?.id;
        // Update local reactions
        const updateReactions = (msg: Message) => {
          if (msg.id !== messageId) return msg;
          let reactions = [...(msg.reactions || [])];
          if (data.action === "added") {
            reactions.push({
              emoji,
              userId,
              user: { id: userId, name: session?.user?.name ?? null },
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

  // Start a video huddle
  const startHuddle = async () => {
    if (!workspace || !selectedChannel) return;
    // Create a unique room ID for this channel's huddle
    // We append a timestamp to ensure fresh rooms if needed, or we could just use channelId to have a persistent channel room
    // Let's use channelId so it's a persistent "channel huddle"
    const roomId = `${workspace.slug}-${selectedChannel.id}-huddle`;

    // Post a message to the channel so others can join
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          content: `🎥 I started a huddle! Click to join: #huddle:${roomId}`,
        }),
      });
    } catch (error) {
      console.error("Failed to post huddle message:", error);
    }

    router.push(`/workspace/${workspace.slug}/video/${roomId}`);
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

  const sendMessage = async (content: string, attachment: any | null, clientId: string) => {
    if (!content.trim() && !attachment) return;
    if (!selectedChannel) return;

    // Optimistic: immediately show the message in the UI
    const optimisticMsg: Message = {
      id: clientId, // Use clientId as temp ID for simplicity, or keep temp-ID
      clientId, // Critical for deduping
      content: content.trim(),
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
      attachments: attachment ? [attachment] : undefined,
      status: "pending",
    } as Message;

    addMessage(optimisticMsg);

    // Send to server in background
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          content: content.trim(),
          attachments: attachment ? [attachment] : undefined,
          parentId: replyingTo?.id || undefined,
          clientId, // Send clientId
        }),
      });

      if (!res.ok) {
        // Mark as failed so user can retry
        updateMessage(clientId, { status: "failed" } as Partial<Message>);
      }
      // If OK, rely on socket "new-message" to replace/confirm logic in useSocket
    } catch (error) {
      console.error("Error sending message:", error);
      updateMessage(clientId, { status: "failed" } as Partial<Message>);
    } finally {
      setReplyingTo(null);
    }
  };

  // ... (Create Task) ...

  // ... (Retry Message) ...

  // ... (Thread Logic) ...

  // Typing Indicator Component
  const TypingIndicator = () => {
    const typers = typingUsers.filter((u) => u.userId !== currentUser?.id);
    if (typers.length === 0) return null;

    const text =
      typers.length === 1
        ? `${typers[0].name} is typing...`
        : typers.length === 2
          ? `${typers[0].name} and ${typers[1].name} are typing...`
          : `${typers.length} people are typing...`;

    return (
      <div className="text-xs text-muted-foreground italic px-4 py-1 h-6 animate-pulse">
        {text}
      </div>
    );
  };

  // Create a Kanban task from a message
  const handleCreateTask = async (message: Message) => {
    if (!workspace) return;
    try {
      // 1. Fetch boards
      const boardsRes = await fetch(`/api/boards?workspaceId=${workspace.id}`);
      if (!boardsRes.ok) throw new Error("Failed to fetch boards");
      const boards = await boardsRes.json();

      let targetBoard = boards[0];
      if (!targetBoard) {
        // Create default board if none
        const createRes = await fetch("/api/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Tasks", workspaceId: workspace.id }),
        });
        if (!createRes.ok) throw new Error("Failed to create board");
        targetBoard = await createRes.json();
      }

      // 2. Get first column
      let targetColumn = targetBoard.columns?.[0];
      if (!targetColumn) {
        // Create default column if none
        const colRes = await fetch(`/api/boards/${targetBoard.id}/columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "To Do" }),
        });
        if (!colRes.ok) throw new Error("Failed to create column");
        targetColumn = await colRes.json();
      }

      // 3. Create card
      const cardRes = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:
            message.content.substring(0, 50) +
            (message.content.length > 50 ? "..." : ""),
          description: message.content,
          columnId: targetColumn.id,
        }),
      });

      if (cardRes.ok) {
        toast.success("Task created from message");
      } else {
        throw new Error("Failed to create card");
      }
    } catch (e) {
      console.error("Could not create task", e);
      toast.error("Failed to create task");
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      <div className="flex h-[calc(100vh-3.5rem)] bg-background">
        {/* Skeleton Sidebar */}
        <div className="hidden md:flex w-64 border-r flex-col bg-muted/10">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="h-6 w-24 bg-muted animate-pulse rounded-md" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded-md" />
          </div>
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-full bg-muted/50 animate-pulse rounded-md" />
            ))}
            <div className="h-4 w-28 bg-muted animate-pulse rounded mt-8 mb-4" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <div className="h-6 w-6 rounded-full bg-muted/60 animate-pulse flex-shrink-0" />
                <div className="h-4 w-32 bg-muted/60 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b flex items-center gap-3">
            <div className="h-10 w-10 bg-muted animate-pulse rounded-lg" />
            <div>
              <div className="h-5 w-40 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-end gap-6 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full flex-shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className={`h-16 bg-muted/40 animate-pulse rounded-lg ${i % 2 === 0 ? "w-3/4" : "w-1/2"}`} />
                </div>
              </div>
            ))}
          </div>
          <div className="p-4">
            <div className="h-14 w-full bg-muted/60 animate-pulse rounded-xl border" />
          </div>
        </div>
      </div>
    );
  }

  // Compute active target details for Direct Messages to render name/avatar
  const isDirectMessage = selectedChannel?.type === "direct";
  const targetUser = isDirectMessage
    ? workspaceMembers.find(
      (m) =>
        m.id !== currentUser?.id &&
        selectedChannel.members?.some(
          (mem: any) => mem.userId === m.id || mem.user?.id === m.id,
        ),
    )
    : null;

  const displayName = isDirectMessage
    ? targetUser?.name || "Unknown User"
    : selectedChannel?.name || "";
  const displayAvatar = isDirectMessage ? targetUser?.image : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background overflow-hidden">
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
                w-72 md:w-64 border-r flex flex-col flex-shrink-0
                bg-card
                transform transition-transform duration-200 ease-in-out
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}
      >
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight truncate">
                  {workspace?.slug || "Workspace"}
                </p>
                <div className="flex items-center gap-1">
                  {connected ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span className="text-[10px] text-muted-foreground">{connected ? "Online" : "Offline"}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowNewChannel(!showNewChannel)} className="h-7 w-7 flex-shrink-0">
              {showNewChannel ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
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
          <div className="py-2">
            {/* Channels section */}
            <div className="px-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1 mb-1">Channels</p>
              {channels.filter((c) => c.type !== "direct").length === 0 ? (
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
                channels
                  .filter((c) => c.type !== "direct")
                  .map((channel) => (
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
                      className={`w-full text-left px-3 py-1.5 rounded-md flex items-center gap-2 transition-all relative touch-manipulation active:scale-[0.98] ${selectedChannel?.id === channel.id
                        ? "text-primary-foreground font-medium"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {selectedChannel?.id === channel.id && (
                        <motion.div
                          layoutId="activeSidebarItem"
                          className="absolute inset-0 bg-primary/90 shadow-sm rounded-md"
                          initial={false}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                      <Hash className="w-4 h-4 flex-shrink-0 relative z-10" />
                      <span className="truncate text-sm flex-1 relative z-10">
                        {channel.name}
                      </span>
                      {(channel.unreadCount ?? 0) > 0 &&
                        selectedChannel?.id !== channel.id && (
                          <Badge
                            variant="destructive"
                            className="h-5 min-w-5 px-1.5 text-[10px] font-bold relative z-10 scale-90"
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
          </div>

          {/* Direct Messages Section */}
          <div className="px-3 pt-3 border-t">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1 mb-1">Direct Messages</p>
            <div className="space-y-1">
              {workspaceMembers
                .filter((m) => m.id !== currentUser?.id)
                .map((member) => {
                  // Check if there is already an active direct channel loaded for this user to show active state
                  const activeDmChannel = channels.find(
                    (c) =>
                      c.type === "direct" &&
                      c.members &&
                      c.members.some(
                        (mem) =>
                          (mem as any).userId === member.id ||
                          (mem as any).user?.id === member.id,
                      ),
                  );

                  const isSelected =
                    selectedChannel?.id === activeDmChannel?.id &&
                    selectedChannel !== null;

                  const isOnline = workspaceOnlineUsers.some(
                    (u) => u.user.id === member.id,
                  );

                  return (
                    <button
                      key={member.id}
                      onClick={() => handleDirectMessage(member.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-md flex items-center gap-2 transition-all relative touch-manipulation active:scale-[0.98] ${isSelected
                        ? "text-primary-foreground font-medium"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="activeSidebarItem"
                          className="absolute inset-0 bg-primary/90 shadow-sm rounded-md"
                          initial={false}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                      <div className="relative z-10">
                        <Avatar className="w-5 h-5 flex-shrink-0">
                          <AvatarImage src={member.image || ""} />
                          <AvatarFallback className={avatarFallbackClass(member.name, "text-[10px] font-semibold")}>
                            {member.name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-background"></span>
                        )}
                      </div>
                      <span className="truncate text-sm flex-1 relative z-10">
                        {member.name}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedChannel ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Channel header */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 flex-shrink-0" onClick={() => setSidebarOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>

                {/* Channel Icon or User Avatar */}
                {isDirectMessage ? (
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-9 h-9 border">
                      <AvatarImage src={displayAvatar || ""} />
                      <AvatarFallback className={avatarFallbackClass(displayName, "text-sm font-semibold")}>{displayName[0]}</AvatarFallback>
                    </Avatar>
                    {workspaceOnlineUsers.some((u) => u.user.id === targetUser?.id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                    )}
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-4.5 h-4.5 text-primary" />
                  </div>
                )}

                <div className="min-w-0">
                  <h1 className="font-bold text-sm leading-tight truncate">{displayName}</h1>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {isDirectMessage
                      ? workspaceOnlineUsers.some((u) => u.user.id === targetUser?.id) ? "Active now" : "Offline"
                      : `${selectedChannel.members?.length || 0} members`}
                    {!isDirectMessage && onlineUsers.length > 0 && (
                      <span className="text-emerald-500 ml-1">· {onlineUsers.length + 1} online</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Online user avatars */}
                {!isDirectMessage && onlineUsers.length > 0 && (
                  <div className="hidden sm:flex -space-x-1.5">
                    {onlineUsers.slice(0, 3).map((viewer) => (
                      <Avatar key={viewer.socketId} className="w-6 h-6 border-2 border-background ring-1 ring-emerald-500/40" title={viewer.user.name}>
                        <AvatarImage src={viewer.user.image} />
                        <AvatarFallback className="text-[9px]">{viewer.user.name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                    ))}
                    {onlineUsers.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium">+{onlineUsers.length - 3}</div>
                    )}
                  </div>
                )}
                <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 h-8 px-3 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-500/50" onClick={startHuddle}>
                  <Video className="w-3.5 h-3.5" />
                  Start Call
                </Button>
              </div>
            </div>

            {/* Channel topic/description bar */}
            {selectedChannel.type !== "direct" && (
              <>
                {selectedChannel.description && !editingDescription && (
                  <div
                    className="px-4 py-1.5 border-b bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors flex items-center gap-2"
                    onClick={() => { setEditingDescription(true); setDescriptionDraft(selectedChannel.description || ""); }}
                  >
                    <span className="text-[11px] text-muted-foreground/70">📌</span>
                    <p className="text-xs text-muted-foreground truncate flex-1">{selectedChannel.description}</p>
                    <Pencil className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                  </div>
                )}
                {editingDescription && (
                  <div className="px-4 py-2 border-b bg-muted/20 flex items-center gap-2">
                    <Input value={descriptionDraft} onChange={(e) => setDescriptionDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveDescription()} placeholder="Set a channel topic..." className="h-7 text-xs flex-1" autoFocus />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveDescription}><Check className="w-3.5 h-3.5 text-emerald-500" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingDescription(false)}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
                {!selectedChannel.description && !editingDescription && (
                  <button className="px-4 py-1 border-b text-[11px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20 transition-colors w-full text-left flex items-center gap-1.5" onClick={() => { setEditingDescription(true); setDescriptionDraft(""); }}>
                    <Plus className="w-2.5 h-2.5" /> Add a topic
                  </button>
                )}
              </>
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
            <div
              className="flex-1 min-h-0 overflow-y-auto p-4"
              ref={scrollAreaRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                setScrolledUp(distFromBottom > 200);
              }}
            >
              <div className="space-y-[2px]">
                {allMessages.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      {selectedChannel.type === "direct" && displayAvatar ? (
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={displayAvatar} />
                          <AvatarFallback>{displayName[0]}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <MessageSquare className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <h3 className="font-medium text-lg mb-1">
                      {selectedChannel.type === "direct"
                        ? `This is the beginning of your direct message history with ${displayName}`
                        : `Welcome to #${selectedChannel.name}`}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {selectedChannel.type === "direct"
                        ? "Say hi!"
                        : "This is the beginning of the channel. Say hi!"}
                    </p>
                  </div>
                ) : (
                  allMessages.map((message, i) => {
                    const prevMessage = allMessages[i - 1];
                    const showAvatar =
                      i === 0 || prevMessage?.author.id !== message.author.id;
                    const isOwnMessage =
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      message.author.id === (session?.user as any)?.id;
                    const isEditing = editingMessageId === message.id;

                    // Date separator logic
                    const showDateSep = i === 0 || (
                      new Date(message.createdAt).toDateString() !==
                      new Date(allMessages[i - 1].createdAt).toDateString()
                    );

                    return (
                      <div key={message.id}>
                        {/* Date separator */}
                        {showDateSep && (
                          <div className="sticky top-0 z-20 flex justify-center my-2 pointer-events-none">
                            <span className="pointer-events-auto text-[11px] font-semibold text-foreground bg-background border shadow-sm rounded-full px-3 py-0.5 cursor-pointer hover:shadow-md transition-shadow">
                              {formatDateSeparator(message.createdAt)} ▾
                            </span>
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`relative group flex items-start gap-2 px-4 -mx-4 py-0.5 hover:bg-muted/30 transition-colors ${showAvatar ? "mt-2" : ""} ${message.status === "pending" ? "opacity-50" : ""} ${message.status === "failed" ? "bg-red-500/5" : ""}`}
                        >
                          {/* Avatar gutter */}
                          {showAvatar ? (
                            <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                              <AvatarImage src={message.author.image || ""} />
                              <AvatarFallback className={avatarFallbackClass(message.author.name, "text-[11px] font-semibold")}>
                                {message.author.name?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 flex-shrink-0 flex items-center justify-center">
                              <span className="text-[10px] text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors tabular-nums">
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                              </span>
                            </div>
                          )}

                          {/* Message body */}
                          <div className="flex-1 min-w-0">
                            {/* Author + timestamp header (only for first in group) */}
                            {showAvatar && (
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-[13px] hover:underline cursor-pointer">
                                  {message.author.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground/60 leading-none">
                                  {formatTime(message.createdAt)}
                                </span>
                                {isOwnMessage && (() => {
                                  const msgTime = new Date(message.createdAt).getTime();
                                  const currentUserId = (session?.user as any)?.id;
                                  const isRead = Object.entries(readTimestamps).some(
                                    ([uid, ts]) => uid !== currentUserId && new Date(ts).getTime() >= msgTime
                                  );
                                  const tickStatus = message.status === "pending" ? "sending" : isRead ? "read" : "sent";
                                  return <MessageTicks status={tickStatus} />;
                                })()}
                                {message.isEdited && <span className="text-[10px] text-muted-foreground/50">(edited)</span>}
                              </div>
                            )}

                            {/* Reply quote */}
                            {message.parentMessage && (
                              <div className="mb-0.5 pl-2 border-l-2 border-primary/30 py-0.5 mt-0.5">
                                <span className="text-[11px] font-semibold text-primary/60">{message.parentMessage.author?.name}</span>
                                <span className="text-[11px] text-muted-foreground ml-1.5 truncate">{message.parentMessage.content}</span>
                              </div>
                            )}

                            {isEditing ? (
                              <div className="flex items-center gap-2 my-0.5">
                                <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEditing(); }} className="flex-1 h-7 text-sm" autoFocus />
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit}><Check className="w-3.5 h-3.5 text-emerald-500" /></Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditing}><X className="w-3.5 h-3.5" /></Button>
                              </div>
                            ) : (
                              <>
                                <div className={`text-[13px] leading-snug break-words ${message.isDeleted ? "italic text-muted-foreground" : ""}`}>
                                  {message.isDeleted ? message.content : (
                                    <MessageContent content={message.content} workspaceMembers={workspaceMembers} />
                                  )}
                                </div>

                                {message.attachments && <AttachmentPreview attachments={message.attachments} />}

                                {message.status === "failed" && (
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-destructive">Failed</span>
                                    <button onClick={() => retryMessage(message)} className="text-[10px] text-accent hover:underline flex items-center gap-0.5"><RefreshCw className="w-2.5 h-2.5" /> Retry</button>
                                    <button onClick={() => removeMessage(message.id)} className="text-[10px] text-muted-foreground hover:text-foreground">Dismiss</button>
                                  </div>
                                )}

                                {/* Reaction counts — tight to message */}
                                {(message.reactions?.length ?? 0) > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {(Object.entries(
                                      (message.reactions || []).reduce(
                                        (acc: Record<string, { count: number; users: string[]; hasOwn: boolean }>, r: Reaction) => {
                                          if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [], hasOwn: false };
                                          acc[r.emoji].count++;
                                          acc[r.emoji].users.push(r.user?.name || "Unknown");
                                          if (r.userId === (session?.user as any)?.id) acc[r.emoji].hasOwn = true;
                                          return acc;
                                        },
                                        {} as Record<string, { count: number; users: string[]; hasOwn: boolean }>,
                                      ),
                                    ) as [string, { count: number; users: string[]; hasOwn: boolean }][]).map(([emoji, data]) => (
                                      <button key={emoji} onClick={() => toggleReaction(message.id, emoji)}
                                        className={`inline-flex items-center gap-0.5 h-5 px-1.5 rounded-full text-[11px] border transition-colors ${data.hasOwn ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/50 border-transparent hover:border-border hover:bg-muted"}`}
                                        title={data.users.join(", ")}
                                      >
                                        <span className="leading-none">{emoji}</span>
                                        <span className="font-medium leading-none">{data.count}</span>
                                      </button>
                                    ))}
                                    <button onClick={() => { }} className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-transparent hover:border-border hover:bg-muted text-muted-foreground/50 hover:text-muted-foreground text-[11px] transition-colors" title="Add reaction">+</button>
                                  </div>
                                )}

                                {/* Thread indicator */}
                                {(message.replyCount || 0) > 0 && (
                                  <button onClick={() => openThread(message)} className="flex items-center gap-1 mt-0.5 text-[11px] text-primary hover:underline font-medium">
                                    <MessageSquare className="w-3 h-3" />
                                    {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          {/* Hover toolbar — Slack-style with text labels */}
                          {!message.isDeleted && !message.status && (
                            <div className="absolute top-0 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-10 -translate-y-1/2">
                              <div className="flex items-center bg-popover border rounded-md shadow-sm overflow-hidden">
                                <button onClick={() => toggleReaction(message.id, "✅")} className="h-7 w-7 flex items-center justify-center hover:bg-muted text-[13px] transition-colors" title="Complete">✅</button>
                                <button onClick={() => toggleReaction(message.id, "👀")} className="h-7 w-7 flex items-center justify-center hover:bg-muted text-[13px] transition-colors" title="Eyes">👀</button>
                                <button onClick={() => toggleReaction(message.id, "🙌")} className="h-7 w-7 flex items-center justify-center hover:bg-muted text-[13px] transition-colors" title="Raise hands">🙌</button>
                                <div className="w-px h-4 bg-border" />
                                <button onClick={() => toggleReaction(message.id, "")} className="h-7 px-2 flex items-center gap-1 hover:bg-muted text-[11px] text-muted-foreground font-medium transition-colors" title="Add reaction">
                                  <Smile className="w-3.5 h-3.5" /> React
                                </button>
                                <div className="w-px h-4 bg-border" />
                                <button onClick={() => openThread(message)} className="h-7 px-2 flex items-center gap-1 hover:bg-muted text-[11px] text-muted-foreground font-medium transition-colors" title="Reply in thread">
                                  <MessageSquare className="w-3.5 h-3.5" /> Reply
                                </button>
                                <div className="w-px h-4 bg-border" />
                                <button className="h-7 w-7 flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors" title="More actions">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  })
                )}

                {/* Typing indicator — avatar + chat bubble */}
                {typingUsers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="flex items-end gap-2 mt-3 px-1"
                  >
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={typingUsers[0].image || ""} />
                      <AvatarFallback className={avatarFallbackClass(typingUsers[0].name, "text-[10px] font-semibold")}>{typingUsers[0].name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {typingUsers.map((u) => u.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing
                    </span>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <TypingIndicator />

            {/* Scroll-to-bottom FAB */}
            <AnimatePresence>
              {scrolledUp && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="absolute bottom-28 right-6 z-20 flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  New messages
                </motion.button>
              )}
            </AnimatePresence>

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

            <MainChatInput
              onSendMessage={sendMessage}
              onTyping={handleTyping}
              workspaceMembers={workspaceMembers}
              displayName={displayName || ""}
              selectedChannelName={selectedChannel.name}
              isDirectMessage={isDirectMessage}
            />
          </div>
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
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={activeThread.author.image || ""} />
                    <AvatarFallback className="text-xs">
                      {activeThread.author.name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {activeThread.author.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(activeThread.createdAt)}
                      </span>
                    </div>

                    <div className="mt-0.5">
                      <MessageContent
                        content={activeThread.content}
                        workspaceMembers={workspaceMembers}
                      />
                      {activeThread.attachments && (
                        <div className="mt-2">
                          <AttachmentPreview
                            attachments={activeThread.attachments}
                          />
                        </div>
                      )}
                    </div>
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
                        <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                          <AvatarImage src={reply.author.image || ""} />
                          <AvatarFallback className="text-[10px]">
                            {reply.author.name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs">
                              {reply.author.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatTime(reply.createdAt)}
                            </span>
                          </div>

                          <div className="text-sm">
                            <MessageContent
                              content={reply.content}
                              workspaceMembers={workspaceMembers}
                            />
                            {reply.attachments && (
                              <div className="mt-1">
                                <AttachmentPreview
                                  attachments={reply.attachments}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Thread reply input */}
              <div className="p-3 border-t overflow-visible">
                <ThreadReplyInput
                  onSend={sendThreadReply}
                  workspaceMembers={workspaceMembers}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
