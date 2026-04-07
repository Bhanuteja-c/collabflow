import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  Loader2, Send, Smile, Paperclip, X,
  Bold, Italic, Underline, Strikethrough,
  Link2, List, ListOrdered, Code, Quote, AtSign, Plus
} from "lucide-react";
import { toast } from "sonner";

const EMOJI_LIST = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "💯", "✅"];

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface MainChatInputProps {
  onSendMessage: (content: string, attachment: any | null, clientId: string) => Promise<void>;
  onTyping: () => void;
  workspaceMembers: any[];
  displayName: string;
  selectedChannelName?: string;
  isDirectMessage: boolean;
  workspaceId?: string;
  channelId?: string;
}

export function MainChatInput({
  onSendMessage,
  onTyping,
  workspaceMembers,
  displayName,
  selectedChannelName,
  isDirectMessage,
  workspaceId,
  channelId,
}: MainChatInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const addEmoji = (emoji: string) => {
    setValue((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (workspaceId) formData.append("workspaceId", workspaceId);
      formData.append("sourceType", "CHAT");
      if (channelId) formData.append("sourceId", channelId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const attachment = await res.json();
        setPendingAttachment(attachment);
      } else {
        const error = await res.json();
        toast.error(error.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSend = async () => {
    const hasText = value.trim().length > 0;
    if ((!hasText && !pendingAttachment) || sending) return;
    setSending(true);
    const content = hasText ? value : "";
    const attachment = pendingAttachment;
    const clientId = crypto.randomUUID();

    setValue("");
    setShowEmojiPicker(false);
    setPendingAttachment(null);
    inputRef.current?.focus();

    await onSendMessage(content, attachment, clientId);
    setSending(false);
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);
    onTyping();
    const lastWord = val.split(" ").pop();
    if (lastWord?.startsWith("@")) {
      setShowMentionMenu(true);
      setMentionSearch(lastWord.slice(1).toLowerCase());
    } else {
      setShowMentionMenu(false);
    }
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  }, [onTyping]);

  const hasContent = value.trim().length > 0 || !!pendingAttachment;

  // Format toolbar button helper
  const FmtBtn = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors" title={title}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div className="shrink-0 bg-background px-5 pb-5 pt-1 relative">
      {/* Pending attachment chip */}
      {pendingAttachment && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-muted border border-border/50 rounded-lg shadow-sm text-[13px] font-medium text-foreground max-w-[200px]">
            <span className="truncate flex-1">{pendingAttachment.name}</span>
            <button onClick={() => setPendingAttachment(null)} className="flex-shrink-0 hover:bg-primary/20 rounded-md p-1 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />

      {/* Mention autocomplete popup */}
      {showMentionMenu && (
        <div className="absolute bottom-[105%] left-5 mb-2 w-72 bg-card border border-border rounded-lg shadow-lg py-1.5 z-50 overflow-hidden">
          <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Members</div>
          {workspaceMembers.filter((m) => (m.name || "").toLowerCase().includes(mentionSearch)).slice(0, 5).map((member) => (
            <button key={member.id}
              onClick={() => {
                const words = value.split(/(?<=\s)/);
                const mentionAlias = (member.name || "").replace(/\s+/g, "");
                words[words.length - 1] = `@${mentionAlias} `;
                setValue(words.join(""));
                setShowMentionMenu(false);
                inputRef.current?.focus();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-muted/60 text-left transition-colors font-medium text-foreground/90 group"
            >
              <UserAvatar user={{ name: member.name, image: member.image }} className="h-6 w-6 rounded-md shadow-sm border border-border/50 group-hover:scale-105 transition-transform" showStatus={false} />
              <span className="truncate">{member.name}</span>
            </button>
          ))}
          {workspaceMembers.filter((m) => (m.name || "").toLowerCase().includes(mentionSearch)).length === 0 && (
            <div className="px-4 py-6 text-[13px] text-center text-muted-foreground font-medium flex flex-col items-center gap-2">
              <AtSign className="w-5 h-5 opacity-20" />
              No matches found
            </div>
          )}
        </div>
      )}

      {/* Composer container — Professional matte box */}
      <div className="border border-border/70 rounded-[8px] focus-within:border-border focus-within:ring-[3px] focus-within:ring-border/40 transition-all duration-200 bg-background overflow-hidden relative">
        {/* Top: Rich text formatting toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1 bg-muted/30">
          <FmtBtn icon={Bold} title="Bold" />
          <FmtBtn icon={Italic} title="Italic" />
          <FmtBtn icon={Underline} title="Underline" />
          <FmtBtn icon={Strikethrough} title="Strikethrough" />
          <div className="w-px h-4 bg-border/40 mx-1" />
          <FmtBtn icon={Link2} title="Link" />
          <div className="w-px h-4 bg-border/40 mx-1" />
          <FmtBtn icon={ListOrdered} title="Ordered list" />
          <FmtBtn icon={List} title="Bullet list" />
          <div className="w-px h-4 bg-border/40 mx-1" />
          <FmtBtn icon={Code} title="Code" />
          <FmtBtn icon={Quote} title="Blockquote" />
        </div>

        {/* Middle: Text area */}
        <textarea
          ref={inputRef}
          placeholder={isDirectMessage ? `Message ${displayName}` : `Message #${selectedChannelName}`}
          value={value}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (showMentionMenu) setShowMentionMenu(false);
              else handleSend();
            }
          }}
          rows={1}
          className="w-full resize-none bg-transparent px-3 py-2 text-[15px] text-foreground font-normal leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none min-h-[44px] max-h-[40vh] overflow-y-auto"
        />

        {/* Bottom: Action bar */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-background">
          {/* Left actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
              title="Attach file"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
            <div className="w-px h-4 bg-border/40 mx-0.5" />
            <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors text-[11px] font-bold" title="Formatting">
              Aa
            </button>

            {/* Emoji picker */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
                title="Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-9 left-0 bg-popover border rounded-lg shadow-xl p-2 flex gap-1 z-50">
                  {EMOJI_LIST.map((emoji) => (
                    <button key={emoji} onClick={() => addEmoji(emoji)} className="hover:bg-muted p-1.5 rounded-md text-lg transition-all hover:scale-110 active:scale-95">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setValue((prev) => prev + "@");
                setShowMentionMenu(true);
                setMentionSearch("");
                inputRef.current?.focus();
              }}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
              title="Mention someone"
            >
              <AtSign className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Send */}
          <Button
            onClick={handleSend}
            disabled={!hasContent || sending}
            size="icon"
            className={`h-8 w-8 rounded-md flex-shrink-0 transition-colors ${hasContent ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-muted text-muted-foreground/40 cursor-default"}`}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
