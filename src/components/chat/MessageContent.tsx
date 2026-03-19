// src/components/chat/MessageContent.tsx
// Renders chat message content with styled @user and #card mentions
"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  // For plain text messages, parse @Name, #KAN-N, #huddle:id, [text](url), **bold**, and *italic* patterns
  const parts = content.split(/(@[\w]+|#KAN-\d+|#huddle:[\w-]+|\[([^\]]+)\]\(([^)]+)\)|\*\*.*?\*\*|\*.*?\*)/gi);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith("@")) {
          const name = part.slice(1);
          // Try to find the member by name or alias
          const member = workspaceMembers?.find(
            (m) => (m.name || "").replace(/\s+/g, "").toLowerCase() === name.toLowerCase()
              || (m.name || "").toLowerCase() === name.toLowerCase()
          );
          return (
            <span
              key={i}
              className="mention"
              data-type="user"
              style={{ cursor: member ? "pointer" : "default" }}
              onClick={() => {
                if (member && onMentionClick) {
                  onMentionClick(member.id);
                }
              }}
            >
              {part}
            </span>
          );
        }
        if (part.match(/^#KAN-\d+$/i)) {
          return (
            <span
              key={i}
              className="mention"
              data-type="card"
              style={{ cursor: "pointer" }}
            >
              {part}
            </span>
          );
        }
        if (part.match(/^#huddle:[\w-]+$/i)) {
          const roomId = part.slice(8);
          const workspaceSlug = params?.slug as string;
          
          if (!workspaceSlug) {
            return <React.Fragment key={i}>{part}</React.Fragment>;
          }
          
          return (
            <span key={i} className="inline-block align-middle ml-1">
              <Link href={`/workspace/${workspaceSlug}/video/${roomId}`}>
                <Button size="sm" className="h-8 gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors">
                  <Video className="h-3.5 w-3.5" />
                  Join Call
                </Button>
              </Link>
            </span>
          );
        }
        // Markdown link: [text](url)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, linkText, linkUrl] = linkMatch;
          const isInternal = linkUrl.startsWith("/") || linkUrl.startsWith(window?.location?.origin || "__nope__");
          if (isInternal) {
            return (
              <Link key={i} href={linkUrl} className="text-primary hover:underline font-medium">
                {linkText}
              </Link>
            );
          }
          return (
            <a key={i} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
              {linkText}
            </a>
          );
        }
        if (part.match(/^\*\*.*\*\*$/)) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        if (part.match(/^\*.*\*$/)) {
          return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

export default MessageContent;
