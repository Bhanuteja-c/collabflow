import React, { useState, useEffect, useCallback } from "react";
import { Search, Loader2, X, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import * as Dialog from "@radix-ui/react-dialog";

interface SearchResult {
  id: string;
  content: string;
  createdAt: string;
  channelId: string;
  channelName: string;
  authorName: string;
  authorImage: string | null;
}

interface MessageSearchProps {
  workspaceId: string;
  channelId?: string;
  isOpen: boolean;
  onClose: () => void;
  onResultClick: (message: SearchResult) => void;
}

export function MessageSearch({
  workspaceId,
  channelId,
  isOpen,
  onClose,
  onResultClick,
}: MessageSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const url = new URL("/api/messages/search", window.location.origin);
        url.searchParams.set("q", query.trim());
        url.searchParams.set("workspaceId", workspaceId);
        if (channelId) {
          url.searchParams.set("channelId", channelId);
        }

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Search failed");

        const data = await res.json();
        setResults(data.results || []);
        setHasSearched(true);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, workspaceId, channelId]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setHasSearched(false);
      setError(false);
    }
  }, [isOpen]);

  // Format content to highlight match (simple bolding)
  const highlightSnippet = (content: string, term: string) => {
    // Strip HTML tags for clean snippet if it's rich text
    const plainText = content.replace(/<[^>]+>/g, " ");
    const idx = plainText.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return <span className="text-muted-foreground line-clamp-2">{plainText}</span>;

    const start = Math.max(0, idx - 40);
    const end = Math.min(plainText.length, idx + term.length + 40);
    const snippet = plainText.slice(start, end);
    const termReal = plainText.slice(idx, idx + term.length);

    const parts = snippet.split(termReal, 2);
    
    return (
      <span className="text-muted-foreground line-clamp-2">
        {start > 0 && "..."}
        {parts[0]}
        <span className="font-bold text-foreground bg-accent/20 rounded-sm px-0.5">{termReal}</span>
        {parts[1]}
        {end < plainText.length && "..."}
      </span>
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[5%] sm:top-[10%] z-50 grid w-full max-w-lg translate-x-[-50%] gap-4 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden flex flex-col max-h-[85vh]">
          
          <div className="flex items-center gap-3 p-4 border-b">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {error ? (
              <div className="text-center py-8 text-destructive text-sm flex flex-col items-center">
                <X className="h-8 w-8 mb-2 opacity-50" />
                Search failed, try again
              </div>
            ) : !query.trim() ? (
              <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center">
                <Search className="h-12 w-12 mb-4 opacity-20" />
                Type to start searching across messages
              </div>
            ) : loading && !hasSearched ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center">
                <MessageSquare className="h-10 w-10 mb-4 opacity-20" />
                No messages found for &apos;{query}&apos;
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => {
                      onResultClick(msg);
                      onClose();
                    }}
                    className="w-full text-left bg-muted/20 hover:bg-muted/50 p-3 rounded-lg border transition-colors group flex gap-3 items-start"
                  >
                    <UserAvatar user={{ name: msg.authorName, image: msg.authorImage }} className="w-8 h-8" showStatus={false} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm truncate">
                          {msg.authorName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm truncate max-w-[100px]">
                            #{msg.channelName}
                          </span>
                          <span className="flex items-center gap-1 opacity-70">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(msg.createdAt))} ago
                          </span>
                        </div>
                      </div>
                      <div className="text-xs break-words whitespace-pre-wrap">
                        {highlightSnippet(msg.content, query.trim())}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
