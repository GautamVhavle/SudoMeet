"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Reaction {
  id: string;
  emoji: string;
  participantId: string;
  timestamp: Date;
}

interface ReactionLayerProps {
  reactions: Reaction[];
  className?: string;
}

export const ReactionLayer = React.forwardRef<
  HTMLDivElement,
  ReactionLayerProps
>(({ reactions, className }, ref) => {
  const [visibleReactions, setVisibleReactions] = React.useState<Reaction[]>(
    []
  );

  React.useEffect(() => {
    // Add new reactions and auto-remove after 3 seconds
    reactions.forEach((reaction) => {
      setVisibleReactions((prev) => {
        if (prev.some((r) => r.id === reaction.id)) return prev;
        return [...prev, reaction];
      });

      setTimeout(() => {
        setVisibleReactions((prev) =>
          prev.filter((r) => r.id !== reaction.id)
        );
      }, 3000);
    });
  }, [reactions]);

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      {visibleReactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute animate-[float_3s_ease-out_forwards] text-4xl"
          style={{
            left: `${Math.random() * 80 + 10}%`,
            bottom: "10%",
          }}
        >
          {reaction.emoji}
        </div>
      ))}
    </div>
  );
});
ReactionLayer.displayName = "ReactionLayer";
