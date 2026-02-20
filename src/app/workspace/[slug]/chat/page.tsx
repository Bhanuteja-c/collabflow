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
import { useWorkspacePresence } from "@/hooks/useWorkspacePresence";
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
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp,
  Video,
  ListTodo,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AttachmentPreview } from "@/components/chat/AttachmentPreview";

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

export default function ChatPage() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [fetchedMessages, setFetchedMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sending, _setSending] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<
    { id: string; name: string; image?: string; email?: string }[]
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
  const router = useRouter();

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || sending) return;

    // Optimistic: immediately show the message in the UI
    const clientId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: clientId, // Use clientId as temp ID for simplicity, or keep temp-ID
      clientId, // Critical for deduping
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

          {/* Direct Messages Section */}
          <div className="p-4 border-t mt-4">
            <h2 className="font-semibold text-sm mb-3 text-muted-foreground">
              Direct Messages
            </h2>
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
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="w-5 h-5 flex-shrink-0">
                          <AvatarImage src={member.image || ""} />
                          <AvatarFallback className="text-[10px]">
                            {member.name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-background"></span>
                        )}
                      </div>
                      <span className="truncate text-sm font-medium flex-1">
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
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Channel Header (with conditional logic for Direct Messages) */}
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

                {/* Channel Icon or User Avatar */}
                {isDirectMessage ? (
                  <Avatar className="w-10 h-10 border">
                    <AvatarImage src={displayAvatar || ""} />
                    <AvatarFallback>{displayName[0]}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-primary" />
                  </div>
                )}

                <div>
                  <h1 className="font-semibold">{displayName}</h1>
                  <p className="text-xs text-muted-foreground">
                    {isDirectMessage
                      ? "Direct Message"
                      : `${selectedChannel.members?.length || 0} members`}
                    {!isDirectMessage && onlineUsers.length > 0 && (
                      <span className="ml-2 text-emerald-500">
                        • {onlineUsers.length + 1} online
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Online users avatars (Hide for DMs to save space, or just show them) */}
              {!isDirectMessage && onlineUsers.length > 0 && (
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

              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center gap-2 ml-2 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500"
                onClick={startHuddle}
              >
                <Video className="w-4 h-4" />
                <span>Start Call</span>
              </Button>
            </div>

            {/* Channel Description (Hide for DMs) */}
            {selectedChannel.type !== "direct" && (
              <>
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
            <ScrollArea className="flex-1 p-4">
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

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 group hover:bg-muted/50 rounded-lg px-2 py-0.5 -mx-2 ${showAvatar ? "mt-4 pt-1" : ""} ${message.status === "pending" ? "opacity-60" : ""} ${message.status === "failed" ? "border-l-2 border-red-500" : ""}`}
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
                                <div
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
                                </div>
                              </div>

                              {/* Attachments */}
                              {message.attachments && (
                                <AttachmentPreview
                                  attachments={message.attachments}
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
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => handleCreateTask(message)}
                                    title="Create Task"
                                  >
                                    <ListTodo className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}

                              {/* Reaction counts display */}
                              {(message.reactions?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(
                                    Object.entries(
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
                                          r: Reaction,
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
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                                    ) as [
                                      string,
                                      {
                                        count: number;
                                        users: string[];
                                        hasOwn: boolean;
                                      },
                                    ][]
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

            <TypingIndicator />

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

                {/* Mention autocomplete menu */}
                {showMentionMenu && (
                  <div className="absolute bottom-12 left-0 w-64 bg-popover border rounded-lg shadow-lg py-1 z-50">
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b">
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
                            const words = newMessage.split(/(?<=\s)/); // Keep trailing spaces on previous words
                            const lastWordIndex = words.length - 1;
                            const mentionAlias = (member.name || "").replace(
                              /\s+/g,
                              "",
                            ); // "John Doe" -> "JohnDoe"
                            words[lastWordIndex] = `@${mentionAlias} `;
                            setNewMessage(words.join(""));
                            setShowMentionMenu(false);
                            inputRef.current?.focus();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.image || ""} />
                            <AvatarFallback className="text-[10px]">
                              {member.name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{member.name}</span>
                        </button>
                      ))}
                    {workspaceMembers.filter((m) =>
                      (m.name || "").toLowerCase().includes(mentionSearch),
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No matches found
                      </div>
                    )}
                  </div>
                )}

                <Input
                  ref={inputRef}
                  placeholder={
                    isDirectMessage
                      ? `Message ${displayName}`
                      : `Message #${selectedChannel.name}`
                  }
                  value={newMessage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewMessage(val);
                    handleTyping();

                    // Mention detection
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
                        sendMessage();
                      }
                    }
                  }}
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
