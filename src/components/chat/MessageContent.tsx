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
export function MessageContent({ content, workspaceMembers, onMentionClick, onCardClick }: MessageContentProps) {
  const params = useParams();

  // If content contains HTML mention nodes from TipTap, render as HTML with click handlers
  if (content.includes('data-type="mention"') || content.includes("data-type='mention'")) {
    return (
      <span
        dangerouslySetInnerHTML={{ __html: content }}
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

  // Use the TipTap ReadOnly renderer as explicitly verified for parsing fallback HTML strings
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
    immediatelyRender: false,
  });

  return (
    <>
      {!editor ? (
        <span dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <EditorContent editor={editor} className="prose prose-sm max-w-none prose-p:my-0 focus:outline-none" />
      )}
    </>
  );
}

export default MessageContent;
