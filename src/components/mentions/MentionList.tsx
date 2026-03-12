// src/components/mentions/MentionList.tsx
"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

export interface MentionItem {
  id: string;
  label: string;       // Display name or card title
  image?: string;      // Avatar URL (for users)
  subtitle?: string;   // e.g., "KAN-5" for cards, email for users
}

export interface MentionListProps {
  items: MentionItem[];
  command: (item: { id: string; label: string }) => void;
  type?: "user" | "card";
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command, type = "user" }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.label });
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) =>
            (prev + items.length - 1) % items.length
          );
          return true;
        }

        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }

        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="mention-suggestion-popup">
          <div className="mention-suggestion-empty">No results</div>
        </div>
      );
    }

    return (
      <div className="mention-suggestion-popup">
        <div className="mention-suggestion-header">
          {type === "user" ? "Members" : "Cards"}
        </div>
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`mention-suggestion-item ${
              index === selectedIndex ? "is-selected" : ""
            }`}
            onClick={() => selectItem(index)}
          >
            {type === "user" ? (
              <div className="mention-avatar">
                {item.image ? (
                  <img src={item.image} alt={item.label} />
                ) : (
                  <span>{item.label[0]?.toUpperCase() || "?"}</span>
                )}
              </div>
            ) : (
              <span className="mention-card-key">
                {item.subtitle || "#"}
              </span>
            )}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";
export default MentionList;
