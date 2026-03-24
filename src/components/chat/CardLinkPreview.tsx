// src/components/chat/CardLinkPreview.tsx
// Inline card reference with hover preview
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Calendar, User, Flag, CheckSquare } from "lucide-react";

interface CardData {
    id: string;
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    status?: string;
    assignee?: {
        id: string;
        name: string;
        image?: string;
    };
    column?: {
        title: string;
    };
}

interface CardLinkPreviewProps {
    cardId: string;
}

const priorityColors: Record<string, string> = {
    low: "bg-green-500/20 text-green-700",
    medium: "bg-yellow-500/20 text-yellow-700",
    high: "bg-orange-500/20 text-orange-700",
    urgent: "bg-red-500/20 text-red-700",
};

export function CardLinkPreview({ cardId }: CardLinkPreviewProps) {
    const params = useParams();
    const workspaceSlug = params?.slug as string;
    const [card, setCard] = useState<CardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    // Fetch card data on hover
    const fetchCard = async () => {
        if (card || loading) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/cards/${cardId}/details`);
            if (res.ok) {
                const data = await res.json();
                setCard(data);
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
                <Link
                    href={`/workspace/${workspaceSlug}/kanban?card=${cardId}`}
                    className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline bg-amber-500/10 rounded px-1.5 py-0.5 -mx-0.5 font-medium text-sm"
                    onMouseEnter={fetchCard}
                >
                    <CheckSquare className="w-3 h-3" />
                    <span>{card?.title || `Card`}</span>
                </Link>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 p-4" side="top" align="start">
                {loading && (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                )}
                {error && (
                    <div className="text-sm text-red-500">Card not found</div>
                )}
                {card && (
                    <div className="space-y-3">
                        {/* Card Title */}
                        <div>
                            <h4 className="font-semibold text-sm">{card.title}</h4>
                            {card.column && (
                                <p className="text-xs text-muted-foreground">
                                    in {card.column.title}
                                </p>
                            )}
                        </div>

                        {/* Description Preview */}
                        {card.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                                {card.description}
                            </p>
                        )}

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-2">
                            {card.priority && (
                                <Badge
                                    variant="secondary"
                                    className={`text-xs ${priorityColors[card.priority] || ''}`}
                                >
                                    <Flag className="w-3 h-3 mr-1" />
                                    {card.priority}
                                </Badge>
                            )}
                            {card.status && (
                                <Badge variant="outline" className="text-xs">
                                    {card.status}
                                </Badge>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t">
                            {card.assignee ? (
                                <div className="flex items-center gap-2">
                                    <UserAvatar user={{ name: card.assignee.name, image: card.assignee.image }} className="h-5 w-5" showStatus={false} />
                                    <span className="text-xs text-muted-foreground">
                                        {card.assignee.name}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="w-3 h-3" />
                                    <span>Unassigned</span>
                                </div>
                            )}
                            {card.dueDate && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    <span>{formatDate(card.dueDate)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </HoverCardContent>
        </HoverCard>
    );
}
