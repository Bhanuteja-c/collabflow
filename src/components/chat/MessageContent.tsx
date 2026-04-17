// src/components/chat/MessageContent.tsx
// Renders chat message content with styled @user and #card mentions
"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface WorkspaceMember {
  id: string;
  name: string;
  image?: string;
  email?: string;
}

interface MessageContentProps {
  content: string;
  workspaceMembers?: WorkspaceMember[];
  onMentionClick?: (userId: string) => void;
  onCardClick?: (cardId: string) => void;
}

/**
 * Parses message HTML/text content and renders mention nodes as styled badges.
 *
 * Supports two formats:
 * 1. TipTap HTML mention nodes: <span data-type="mention" data-id="..." data-label="...">
 * 2. Plain text mentions: @Name, #KAN-123
 */
/**
 * Lightweight markdown-to-HTML converter for system messages
 * that may have been stored using markdown syntax.
 */
function convertMarkdownToHtml(text: string): string {
  // Skip if content already contains HTML tags (already converted)
  if (/<[a-z][\s\S]*>/i.test(text) && !text.includes('**')) return text;
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="underline text-primary hover:text-primary/80">$1</a>')
    .replace(/\n/g, '<br>');
}

export function MessageContent({ content, workspaceMembers, onMentionClick, onCardClick }: MessageContentProps) {
  const params = useParams();

  // Pre-process: convert any residual markdown to HTML
  const processedContent = convertMarkdownToHtml(content);

  // If content contains HTML mention nodes from TipTap, render as HTML with click handlers
  if (processedContent.includes('data-type="mention"') || processedContent.includes("data-type='mention'")) {
    return (
      <span
        dangerouslySetInnerHTML={{ __html: processedContent }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const mention = target.closest("[data-type='mention'], [data-mention-type]") as HTMLElement;
          if (!mention) return;
          
          const mentionType = mention.getAttribute("data-mention-type") || mention.getAttribute("data-type");
          const mentionId = mention.getAttribute("data-id");
          
          if (mentionType === "card" && mentionId && onCardClick) {
            onCardClick(mentionId);
          } else if (mentionType === "user" && mentionId && onMentionClick) {
            onMentionClick(mentionId);
          }
        }}
      />
    );
  }

  // Check if this is a video call invitation
  if (processedContent.includes("#huddle:")) {
    const match = processedContent.match(/#huddle:([a-zA-Z0-9_-]+)/);
    if (match) {
      const roomId = match[1];
      const text = processedContent.replace(match[0], "").trim();
      return (
        <div className="flex flex-col gap-2 mt-1">
          <span className="text-[13px]" dangerouslySetInnerHTML={{ __html: text }} />
          <Button 
            variant="default" 
            className="w-fit bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 shadow-sm"
            asChild
          >
            <Link href={`/workspace/${params?.slug}/video/${roomId}`}>
              <Video className="w-4 h-4" />
              Join Call
            </Link>
          </Button>
        </div>
      );
    }
  }

  // Use the TipTap ReadOnly renderer as explicitly verified for parsing fallback HTML strings
  const editor = useEditor({
    extensions: [StarterKit],
    content: processedContent,
    editable: false,
    immediatelyRender: false,
  });

  return (
    <>
      {!editor ? (
        <span dangerouslySetInnerHTML={{ __html: processedContent }} />
      ) : (
        <EditorContent editor={editor} className="prose prose-sm max-w-none prose-p:my-0 focus:outline-none" />
      )}
    </>
  );
}

export default MessageContent;
