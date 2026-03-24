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
}

export function MainChatInput({
  onSendMessage,
  onTyping,
  workspaceMembers,
  displayName,
  selectedChannelName,
  isDirectMessage
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
    <div className="px-4 pb-3 pt-1.5 bg-background relative">
      {/* Pending attachment chip */}
      {pendingAttachment && (
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs font-medium text-primary">
            <span className="truncate max-w-[160px]">{pendingAttachment.name}</span>
            <button onClick={() => setPendingAttachment(null)} className="flex-shrink-0 hover:bg-primary/20 rounded p-0.5 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />

      {/* Mention autocomplete popup */}
      {showMentionMenu && (
        <div className="absolute bottom-full left-4 mb-1 w-64 bg-popover border rounded-lg shadow-xl py-1 z-50">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground border-b uppercase tracking-widest">Members</div>
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
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-muted text-left transition-colors"
            >
              <UserAvatar user={{ name: member.name, image: member.image }} className="h-5 w-5" showStatus={false} />
              <span className="truncate font-medium">{member.name}</span>
            </button>
          ))}
          {workspaceMembers.filter((m) => (m.name || "").toLowerCase().includes(mentionSearch)).length === 0 && (
            <div className="px-3 py-4 text-sm text-center text-muted-foreground">No matches</div>
          )}
        </div>
      )}

      {/* Composer container — Slack-style bordered box */}
      <div className="border border-border/60 rounded-lg focus-within:border-primary/50 focus-within:shadow-[0_0_0_1px] focus-within:shadow-primary/20 transition-all bg-background">
        {/* Top: Rich text formatting toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/40">
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
          className="w-full resize-none bg-transparent px-3 py-2 text-[13px] leading-snug placeholder:text-muted-foreground/40 focus:outline-none min-h-[36px] max-h-[120px] overflow-y-auto"
        />

        {/* Bottom: Action bar */}
        <div className="flex items-center justify-between px-2 py-1 border-t border-border/40">
          {/* Left actions */}
          <div className="flex items-center gap-0.5">
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
            className={`h-7 w-7 rounded-md flex-shrink-0 transition-all ${hasContent ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" : "bg-muted/50 text-muted-foreground/30 cursor-default"}`}
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
