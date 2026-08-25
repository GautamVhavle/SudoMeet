"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useReactions } from "@/hooks/use-reactions";

interface ReactionLayerProps {
  meetingId: string;
  className?: string;
}

export const ReactionLayer = React.forwardRef<
  HTMLDivElement,
  ReactionLayerProps
>(({ meetingId, className }, ref) => {
  const { reactions } = useReactions(meetingId);

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      {reactions.map((reaction) => (
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
