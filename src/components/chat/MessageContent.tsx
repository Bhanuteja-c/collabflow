// src/components/chat/MessageContent.tsx
// Renders message content with @mentions and entity links
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CardLinkPreview } from "./CardLinkPreview";

interface MessageContentProps {
    content: string;
    workspaceMembers?: { id: string; name: string; image?: string }[];
    onMentionClick?: (userId: string) => void;
}

// Patterns for parsing
const MENTION_REGEX = /@(\w+)/g;
const CARD_LINK_REGEX = /#card:(\w+)/g;
const DOC_LINK_REGEX = /#doc:(\w+)/g;

interface ContentPart {
    type: 'text' | 'mention' | 'card' | 'doc';
    content: string;
    id?: string;
}

function parseContent(content: string): ContentPart[] {
    const parts: ContentPart[] = [];
    let lastIndex = 0;

    // Combined regex to match all patterns
    const combinedRegex = /(@\w+|#card:\w+|#doc:\w+)/g;
    let match;

    while ((match = combinedRegex.exec(content)) !== null) {
        // Add text before this match
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: content.slice(lastIndex, match.index),
            });
        }

        const matched = match[0];

        if (matched.startsWith('@')) {
            parts.push({
                type: 'mention',
                content: matched,
                id: matched.slice(1), // Remove @
            });
        } else if (matched.startsWith('#card:')) {
            parts.push({
                type: 'card',
                content: matched,
                id: matched.slice(6), // Remove #card:
            });
        } else if (matched.startsWith('#doc:')) {
            parts.push({
                type: 'doc',
                content: matched,
                id: matched.slice(5), // Remove #doc:
            });
        }

        lastIndex = match.index + matched.length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
        parts.push({
            type: 'text',
            content: content.slice(lastIndex),
        });
    }

    return parts;
}

export function MessageContent({ content, workspaceMembers, onMentionClick }: MessageContentProps) {
    const params = useParams();
    const workspaceSlug = params?.slug as string;

    const parts = useMemo(() => parseContent(content), [content]);

    // Check if mentioned user exists
    const getMemberByName = (name: string) => {
        return workspaceMembers?.find(m =>
            m.name?.toLowerCase() === name.toLowerCase()
        );
    };

    return (
        <span className="whitespace-pre-wrap">
            {parts.map((part, i) => {
                switch (part.type) {
                    case 'mention': {
                        const member = getMemberByName(part.id || '');
                        if (member) {
                            return (
                                <button
                                    key={i}
                                    onClick={() => onMentionClick?.(member.id)}
                                    className="text-primary font-medium hover:underline bg-primary/10 rounded px-1 -mx-0.5"
                                >
                                    {part.content}
                                </button>
                            );
                        }
                        // Unknown mention - still highlight
                        return (
                            <span key={i} className="text-primary font-medium">
                                {part.content}
                            </span>
                        );
                    }

                    case 'card':
                        return (
                            <CardLinkPreview key={i} cardId={part.id || ''} />
                        );

                    case 'doc':
                        return (
                            <Link
                                key={i}
                                href={`/workspace/${workspaceSlug}/documents/${part.id}`}
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline bg-blue-500/10 rounded px-1 -mx-0.5 font-medium"
                            >
                                <span className="text-[10px]">📄</span>
                                <span>Doc</span>
                            </Link>
                        );

                    default:
                        return <span key={i}>{part.content}</span>;
                }
            })}
        </span>
    );
}
