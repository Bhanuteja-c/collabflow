// src/components/chat/MessageContent.tsx
// Renders message content with @mentions, entity links, and code blocks
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CardLinkPreview } from "./CardLinkPreview";
import { CodeBlock } from "./CodeBlock";

interface MessageContentProps {
    content: string;
    workspaceMembers?: { id: string; name: string; image?: string }[];
    onMentionClick?: (userId: string) => void;
}

interface ContentPart {
    type: 'text' | 'mention' | 'card' | 'doc' | 'code';
    content: string;
    id?: string;
    language?: string;
}

// Parse code blocks first, then inline elements
function parseContent(content: string): ContentPart[] {
    const parts: ContentPart[] = [];

    // First, extract code blocks (```language\ncode```)
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        // Parse text before code block for inline elements
        if (match.index > lastIndex) {
            const textBefore = content.slice(lastIndex, match.index);
            parts.push(...parseInlineElements(textBefore));
        }

        // Add code block
        parts.push({
            type: 'code',
            content: match[2].trim(),
            language: match[1] || '',
        });

        lastIndex = match.index + match[0].length;
    }

    // Parse remaining text for inline elements
    if (lastIndex < content.length) {
        parts.push(...parseInlineElements(content.slice(lastIndex)));
    }

    return parts;
}

// Parse inline elements (@mentions, #card:, #doc:)
function parseInlineElements(content: string): ContentPart[] {
    const parts: ContentPart[] = [];
    let lastIndex = 0;

    // Combined regex to match all inline patterns
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
                id: matched.slice(1),
            });
        } else if (matched.startsWith('#card:')) {
            parts.push({
                type: 'card',
                content: matched,
                id: matched.slice(6),
            });
        } else if (matched.startsWith('#doc:')) {
            parts.push({
                type: 'doc',
                content: matched,
                id: matched.slice(5),
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
        <div className="whitespace-pre-wrap">
            {parts.map((part, i) => {
                switch (part.type) {
                    case 'code':
                        return (
                            <CodeBlock
                                key={i}
                                code={part.content}
                                language={part.language}
                            />
                        );

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
        </div>
    );
}
