// src/components/chat/MessageTicks.tsx
// WhatsApp-style message delivery/read status ticks using Lucide icons

import { Check, CheckCheck } from "lucide-react";

interface MessageTicksProps {
  status: "sending" | "sent" | "read";
}

export function MessageTicks({ status }: MessageTicksProps) {
  if (status === "sending") {
    // Single grey tick — pending / optimistic
    return (
      <Check
        className="inline-block ml-0.5 flex-shrink-0 text-muted-foreground/50"
        size={12}
        strokeWidth={2.5}
        aria-label="Sending"
      />
    );
  }

  if (status === "sent") {
    // Double grey ticks — delivered to server
    return (
      <CheckCheck
        className="inline-block ml-0.5 flex-shrink-0 text-muted-foreground/50"
        size={13}
        strokeWidth={2.5}
        aria-label="Delivered"
      />
    );
  }

  // Double BLUE ticks — read by at least one other member
  return (
    <CheckCheck
      className="inline-block ml-0.5 flex-shrink-0 text-sky-500"
      size={13}
      strokeWidth={2.5}
      aria-label="Read"
    />
  );
}
