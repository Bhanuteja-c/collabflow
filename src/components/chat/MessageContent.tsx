// src/components/chat/MessageContent.tsx
// Renders chat message content with styled @user and #card mentions
"use client";

import React from "react";

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

  // For plain text messages, parse @Name and #KAN-N patterns
  const parts = content.split(/(@[\w]+|#KAN-\d+)/gi);

  return (
    <>
      {parts.map((part, i) => {
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
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

export default MessageContent;
