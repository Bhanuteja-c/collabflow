// src/app/(dashboard)/chat/page.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/hooks/useSocket";
import { useSharedSocket } from "@/components/providers/SocketProvider";
import { useWorkspacePresence } from "@/hooks/useWorkspacePresence";
import { MessageContent } from "@/components/chat/MessageContent";
import { MessageTicks } from "@/components/chat/MessageTicks";
import { ThreadPanel } from "@/components/chat/ThreadPanel";
import { MessageSearch } from "@/components/chat/MessageSearch";
import {
  Plus,
  Send,
  Hash,
  Users,
  Loader2,
  MessageSquare,
  Search,
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
  ChevronRight,
  Video,
  ListTodo,
  ArrowDown,
  MoreVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AttachmentPreview } from "@/components/chat/AttachmentPreview";
import { MainChatInput } from "@/components/chat/MainChatInput";
import { avatarFallbackClass, getDiceBearAvatar } from "@/lib/avatar-colors";

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
                <UserAvatar user={member} className="h-4 w-4" showStatus={false} />
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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<
    { id: string; name: string; image?: string; email?: string }[]
  >([]);
  const [workspace, setWorkspace] = useState<{
    id: string;
    slug: string;
  } | null>(null);
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelIdParam = searchParams.get("channelId");

  // Sync route param changes to state natively without full page reloads
  useEffect(() => {
    if (channelIdParam && channels.length > 0) {
      const found = channels.find((c) => c.id === channelIdParam);
      if (found && found.id !== selectedChannel?.id) {
        setSelectedChannel(found);
        // Clear active thread view when switching channels
        setActiveThread(null);
      }
    }
  }, [channelIdParam, channels, selectedChannel?.id]);

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

  // Collapsible sidebar sections
  const [channelsSectionOpen, setChannelsSectionOpen] = useState(true);
  const [dmsSectionOpen, setDmsSectionOpen] = useState(true);

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
          if (Array.isArray(data)) {
            setFetchedMessages(data);
            setNextCursor(null);
          } else {
            setFetchedMessages(data.messages.reverse());
            setNextCursor(data.nextCursor);
          }
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    fetchMessages();
  }, [selectedChannel]);

  const loadEarlierMessages = async () => {
    if (!selectedChannel || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const scrollPos = scrollAreaRef.current?.scrollHeight || 0;
      
      const res = await fetch(
        `/api/messages?channelId=${selectedChannel.id}&cursor=${nextCursor}&take=50`
      );
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data) && data.messages.length > 0) {
          const olderMessages = data.messages.reverse();
          setFetchedMessages((prev) => [...olderMessages, ...prev]);
          setNextCursor(data.nextCursor);
          
          setTimeout(() => {
            if (scrollAreaRef.current) {
              const newScrollHeight = scrollAreaRef.current.scrollHeight;
              scrollAreaRef.current.scrollTop = newScrollHeight - scrollPos;
            }
          }, 0);
        }
      }
    } catch (error) {
      console.error("Error loading older messages:", error);
    } finally {
      setLoadingMore(false);
    }
  };

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
        <div className="hidden lg:flex w-64 border-r flex-col bg-muted/10">
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
    <div className="flex h-full bg-background overflow-hidden relative">
      
      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-background border-r border-border/50 z-50 flex flex-col md:hidden shadow-2xl"
            >
              {/* Mobile Sidebar Header */}
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 truncate">
                  <UserAvatar user={{ name: session?.user?.name, image: session?.user?.image }} className="w-8 h-8 rounded-md shrink-0 ring-1 ring-border/50" showStatus={false} />
                  <div className="min-w-0 flex flex-col pt-0.5">
                    <span className="font-bold text-[14px] text-foreground truncate leading-none tracking-tight">{session?.user?.name || "User"}</span>
                    <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground shrink-0" onClick={() => setSidebarOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {/* Mobile Sidebar Nav */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-6 pb-10 custom-scrollbar">
                <div>
                  <div className="px-2 mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-wider text-muted-foreground">CHANNELS</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm text-muted-foreground hover:text-foreground" onClick={() => { setShowNewChannel(true); setSidebarOpen(false); }}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-[1px]">
                    {channels.filter(c => c.type !== "direct").map(ch => (
                      <Link key={ch.id} href={`/workspace/${params?.slug}/chat?channelId=${ch.id}`} onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-2 px-2 py-2 rounded-md text-[13px] group select-none transition-colors", (selectedChannel?.id === ch.id) ? "bg-muted font-medium text-foreground" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground")}>
                        <Hash className={cn("w-4 h-4 shrink-0 opacity-70", selectedChannel?.id === ch.id ? "text-foreground opacity-100" : "group-hover:opacity-100")} />
                        <span className="truncate flex-1">{ch.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="px-2 mb-2"><span className="text-[11px] font-bold tracking-wider text-muted-foreground">DIRECT MESSAGES</span></div>
                  <div className="space-y-[1px]">
                    {channels.filter(c => c.type === "direct").map(ch => {
                      const otherUser = workspaceMembers.find(m => m.id !== (session?.user as any)?.id && ch.members?.some((mem: any) => mem.userId === m.id || mem.user?.id === m.id));
                      const isOnline = otherUser ? workspaceOnlineUsers.some(u => u.user.id === otherUser.id) : false;
                      return (
                        <Link key={ch.id} href={`/workspace/${params?.slug}/chat?channelId=${ch.id}`} onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-2 px-2 py-2 rounded-md text-[13px] group select-none transition-colors", (selectedChannel?.id === ch.id) ? "bg-muted font-medium text-foreground" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground")}>
                          <div className="relative shrink-0 flex items-center justify-center">
                            <UserAvatar user={{ name: otherUser?.name || "User", image: otherUser?.image }} className={cn("w-5 h-5 rounded-sm", selectedChannel?.id === ch.id ? "opacity-100" : "opacity-80 group-hover:opacity-100")} showStatus={false} />
                            {isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-[6px] h-[6px] rounded-full bg-emerald-500 ring-1 ring-background" />}
                          </div>
                          <span className="truncate flex-1">{otherUser?.name || "Unknown"}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Chat Sidebar (Desktop) ── */}
      <div className="w-60 border-r border-border/50 bg-muted/10 hidden md:flex flex-col shrink-0 h-full overflow-hidden z-20">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between sticky top-0 z-10 shrink-0 bg-transparent">
          <div className="flex items-center gap-3 truncate">
            <UserAvatar user={{ name: session?.user?.name, image: session?.user?.image }} className="w-8 h-8 rounded-md shrink-0 ring-1 ring-border/50" showStatus={false} />
            <div className="min-w-0 flex flex-col pt-0.5">
              <span className="font-bold text-[14px] text-foreground truncate leading-none tracking-tight">{session?.user?.name || "User"}</span>
              <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground shrink-0" onClick={() => setShowNewChannel(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable Nav items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-6 pb-10 custom-scrollbar">
          
          {/* Channels */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between group cursor-pointer">
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground hover:text-foreground transition-colors">CHANNELS</span>
            </div>
            <div className="space-y-[1px]">
              {channels.filter(c => c.type !== "direct").map(ch => (
                <Link key={ch.id} href={`/workspace/${params?.slug}/chat?channelId=${ch.id}`} className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] group select-none transition-colors", (selectedChannel?.id === ch.id) ? "bg-muted font-medium text-foreground" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground")}>
                  <Hash className={cn("w-4 h-4 shrink-0 opacity-70", selectedChannel?.id === ch.id ? "text-foreground opacity-100" : "group-hover:opacity-100")} />
                  <span className="truncate flex-1">{ch.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Direct Messages */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between group cursor-pointer">
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground hover:text-foreground transition-colors">DIRECT MESSAGES</span>
            </div>
            <div className="space-y-[1px]">
              {channels.filter(c => c.type === "direct").map(ch => {
                  const otherUser = workspaceMembers.find(m => m.id !== (session?.user as any)?.id && ch.members?.some((mem: any) => mem.userId === m.id || mem.user?.id === m.id));
                  const isOnline = otherUser ? workspaceOnlineUsers.some(u => u.user.id === otherUser.id) : false;
                  return (
                    <Link key={ch.id} href={`/workspace/${params?.slug}/chat?channelId=${ch.id}`} className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] group select-none transition-colors", (selectedChannel?.id === ch.id) ? "bg-muted font-medium text-foreground" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground")}>
                      <div className="relative shrink-0 flex items-center justify-center">
                        <UserAvatar user={{ name: otherUser?.name || "User", image: otherUser?.image }} className={cn("w-4 h-4 rounded-sm transition-opacity", selectedChannel?.id === ch.id ? "opacity-100" : "opacity-80 group-hover:opacity-100")} showStatus={false} />
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-[6px] h-[6px] rounded-full bg-emerald-500 ring-1 ring-background" />
                        )}
                      </div>
                      <span className="truncate flex-1">{otherUser?.name || "Unknown"}</span>
                    </Link>
                  );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Chat messages column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedChannel ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Channel header */}
            <div className="px-3 md:px-5 py-3 border-b border-border flex items-center justify-between bg-background z-10 sticky top-0">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                {/* Mobile hamburger to open sidebar */}
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>

                {/* Channel Icon or User Avatar */}
                {isDirectMessage ? (
                  <div className="relative flex-shrink-0">
                    <UserAvatar user={{ name: displayName, image: displayAvatar }} className="w-8 h-8 rounded-md" showStatus={false} />
                    {workspaceOnlineUsers.some((u) => u.user.id === targetUser?.id) && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                    )}
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <Hash className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                )}

                <div className="min-w-0 flex flex-col justify-center">
                  <h1 className="font-bold text-[15px] leading-tight truncate text-foreground">{displayName}</h1>
                  <p className="text-[12px] text-muted-foreground leading-tight mt-0.5 flex items-center gap-1.5">
                    {isDirectMessage
                      ? workspaceOnlineUsers.some((u) => u.user.id === targetUser?.id) ? <span className="text-emerald-500">Active now</span> : "Offline"
                      : <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {selectedChannel.members?.length || 0} members</span>}
                    {!isDirectMessage && onlineUsers.length > 0 && (
                      <>
                        <span className="text-border mx-0.5">•</span>
                        <span className="text-emerald-500 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {onlineUsers.length + 1} online
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Online user avatars */}
                {!isDirectMessage && onlineUsers.length > 0 && (
                  <div className="hidden sm:flex -space-x-1.5 mr-2 px-2 py-0.5">
                    {onlineUsers.slice(0, 3).map((viewer, i) => (
                      <div key={i} className="relative z-10 hover:z-20 transition-transform">
                        <UserAvatar user={viewer.user} className="w-[24px] h-[24px] rounded-full border border-background shadow-xs" showStatus={false} />
                      </div>
                    ))}
                    {onlineUsers.length > 3 && (
                      <div className="w-[24px] h-[24px] rounded-full bg-muted border border-background flex items-center justify-center text-[9px] font-bold text-muted-foreground z-10">+{onlineUsers.length - 3}</div>
                    )}
                  </div>
                )}
                {!isDirectMessage && (
                  <Button variant="ghost" size="icon" className="hidden sm:flex h-8 w-8 rounded-md text-muted-foreground hover:text-foreground" onClick={() => setSearchOpen(true)}>
                    <Search className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] font-medium transition-colors hover:bg-muted" onClick={startHuddle}>
                  <Video className="w-4 h-4 text-emerald-500" />
                  Call
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

            <div
              className="flex-1 min-h-0 overflow-y-auto px-1 py-4"
              ref={scrollAreaRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                setScrolledUp(distFromBottom > 200);
              }}
            >
              <div className="flex flex-col">
                {allMessages.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      {selectedChannel.type === "direct" && displayAvatar ? (
                        <Avatar className="w-12 h-12">
                          <UserAvatar user={{ name: displayName, image: displayAvatar }} className="w-12 h-12" showStatus={false} />
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
                  <>
                    {nextCursor && (
                      <div className="flex justify-center my-4 w-full">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadEarlierMessages}
                          disabled={loadingMore}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {loadingMore ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                          Load earlier messages
                        </Button>
                      </div>
                    )}
                    {allMessages.map((message, i) => {
                    const prevMessage = allMessages[i - 1];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const isOwnMessage = message.author.id === (session?.user as any)?.id;
                    const isEditing = editingMessageId === message.id;

                    // ── System message detection ──
                    const systemPatterns = [
                      /^📋\s/,   // Assigned
                      /^✅\s/,   // Completed
                      /^📊\s/,   // Board created
                      /^👋\s/,   // Joined
                      /^──\s/,   // Generic system marker
                    ];
                    const isSystemMessage = systemPatterns.some((p) => p.test(message.content));

                    // ── Improved message grouping (same author within 3 minutes) ──
                    const timeDiff = prevMessage
                      ? (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) / 1000
                      : Infinity;
                    const showAvatar =
                      !isSystemMessage &&
                      (i === 0 ||
                        prevMessage?.author.id !== message.author.id ||
                        timeDiff > 180 ||
                        systemPatterns.some((p) => p.test(prevMessage?.content || "")));

                    // Date separator logic
                    const showDateSep = i === 0 || (
                      new Date(message.createdAt).toDateString() !==
                      new Date(allMessages[i - 1].createdAt).toDateString()
                    );

                    // ── System message (compact inline event) ──
                    if (isSystemMessage) {
                      return (
                        <div key={message.id}>
                          {showDateSep && (
                            <div className="sticky top-0 z-20 flex justify-center my-2 pointer-events-none">
                              <span className="pointer-events-auto text-[11px] font-semibold text-foreground bg-background border shadow-sm rounded-full px-3 py-0.5 cursor-pointer hover:shadow-md transition-shadow">
                                {formatDateSeparator(message.createdAt)} ▾
                              </span>
                            </div>
                          )}
                          <div className="flex justify-center my-2 py-1 select-none pointer-events-none">
                            <span className="text-xs italic text-muted-foreground text-center px-4">
                              {message.content}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // ── Regular message ──
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
                          className={`relative group flex items-start gap-4 px-4 py-0.5 hover:bg-foreground/[0.04] transition-colors ${showAvatar ? "mt-4 pt-1" : ""} ${message.status === "pending" ? "opacity-50" : ""} ${message.status === "failed" ? "bg-red-500/5" : ""}`}
                        >
                          {/* Avatar gutter */}
                          {showAvatar ? (
                            <UserAvatar user={{ name: message.author?.name, image: message.author?.image }} className="h-[40px] w-[40px] mt-0.5 flex-shrink-0 border-none shadow-none rounded-[8px]" showStatus={false} />
                          ) : (
                            <div className="w-[40px] flex-shrink-0 flex items-center justify-center">
                              <span className="text-[10px] font-medium text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors tabular-nums">
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                              </span>
                            </div>
                          )}

                          {/* Message body */}
                          <div className="flex-1 min-w-0">
                            {/* Author + timestamp header (only for first in group) */}
                            {showAvatar && (
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="font-bold text-[15px] text-foreground hover:underline cursor-pointer tracking-tight">
                                  {message.author.name}
                                </span>
                                <span className="text-[12px] font-medium text-muted-foreground/60 leading-none">
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
                                {message.isEdited && <span className="text-[10px] text-muted-foreground/40 font-medium">(edited)</span>}
                              </div>
                            )}

                            {/* Reply quote */}
                            {message.parentMessage && (
                              <div className="mb-1.5 pl-3 border-l-2 border-primary/40 py-1 mt-1 bg-muted/20 rounded-r-md">
                                <span className="text-[11px] font-bold text-primary/70 block mb-0.5">{message.parentMessage.author?.name}</span>
                                <span className="text-[12px] text-muted-foreground/90 line-clamp-1">{message.parentMessage.content}</span>
                              </div>
                            )}

                            {isEditing ? (
                              <div className="flex items-center gap-2 my-1">
                                <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEditing(); }} className="flex-1 h-9 text-[14px] rounded-md border-border/60 focus-visible:ring-1 focus-visible:ring-foreground/20 bg-background" autoFocus />
                                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" onClick={saveEdit}><Check className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-md hover:bg-destructive/10 hover:text-destructive" onClick={cancelEditing}><X className="w-4 h-4" /></Button>
                              </div>
                            ) : (
                              <>
                                <div className={`text-[15px] leading-relaxed break-words text-foreground/90 ${message.isDeleted ? "italic text-muted-foreground/50" : ""}`}>
                                  {message.isDeleted ? message.content : (
                                    <MessageContent 
                                      content={message.content} 
                                      workspaceMembers={workspaceMembers} 
                                      onMentionClick={handleDirectMessage} 
                                    />
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
                              <div className="flex bg-background border rounded-md shadow-sm overflow-hidden divide-x opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 z-10">
                                <button onClick={() => toggleReaction(message.id, "✅")} className="h-7 w-7 flex items-center justify-center hover:bg-muted text-[13px] transition-colors" title="Complete">✅</button>
                                <button onClick={() => toggleReaction(message.id, "👀")} className="h-7 w-7 flex items-center justify-center hover:bg-muted text-[13px] transition-colors" title="Eyes">👀</button>
                                <button onClick={() => toggleReaction(message.id, "🙌")} className="h-7 w-7 flex items-center justify-center hover:bg-muted text-[13px] transition-colors" title="Raise hands">🙌</button>
                                <div className="w-[1px] bg-border my-1"></div>
                                <button onClick={() => toggleReaction(message.id, "👍")} className="h-7 px-2 flex items-center gap-1 hover:bg-muted text-[11px] text-muted-foreground font-medium transition-colors" title="Like">
                                  <Smile className="w-3.5 h-3.5" />
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
                  })}
                </>
              )}

                {/* Typing indicator — avatar + chat bubble */}
                {typingUsers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="flex items-end gap-2 mt-3 px-1"
                  >
                    <UserAvatar user={{ name: typingUsers[0].name, image: typingUsers[0].image }} className="h-6 w-6" showStatus={false} />
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
              workspaceId={workspace?.id}
              channelId={selectedChannel.id}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="font-semibold text-lg mb-2">
                No channel selected
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Select a channel or create a new one
              </p>
              <Button variant="outline" className="md:hidden gap-2" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-4 h-4" />
                Browse Channels
              </Button>
            </div>
          </div>
        )}

      {workspace && (
        <MessageSearch
          workspaceId={workspace.id}
          channelId={selectedChannel?.id}
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onResultClick={(message) => {
            const el = document.getElementById(message.id);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("bg-accent/20", "transition-colors", "duration-500");
              setTimeout(() => el.classList.remove("bg-accent/20"), 2000);
            }
          }}
        />
      )}
      </div>

      {/* Thread Panel — renders as sibling on desktop */}
      <AnimatePresence>
        {activeThread && selectedChannel && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[100] lg:static lg:block lg:w-[400px] shrink-0 border-l flex flex-col overflow-hidden bg-background shadow-2xl lg:shadow-none"
          >
            <ThreadPanel
              parentMessage={activeThread}
              channelId={selectedChannel.id}
              workspaceSlug={params.slug as string}
              onClose={() => setActiveThread(null)}
              currentUser={session?.user}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
