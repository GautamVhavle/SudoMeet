/**
 * Reaction picker — UI for sending emoji reactions during calls.
 *
 * Supported reactions: 👍 ❤️ 😂 🎉 👏
 */

"use client";

import * as React from "react";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "../ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useReactions } from "@/hooks/use-reactions";
import type { ReactionEmoji } from "@/stores/reactions";

interface ReactionPickerProps {
  meetingId: string;
  participantId: string;
  participantName: string;
  className?: string;
}

const REACTION_EMOJIS: ReactionEmoji[] = ["👍", "❤️", "😂", "🎉", "👏"];

export const ReactionPicker = React.forwardRef<
  HTMLButtonElement,
  ReactionPickerProps
>(({ meetingId, participantId, participantName, className }, ref) => {
  const { send } = useReactions(meetingId);
  const [open, setOpen] = React.useState(false);

  const handleReaction = async (emoji: ReactionEmoji) => {
    await send(participantId, participantName, emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton
          ref={ref}
          variant="ghost"
          size="sm"
          className={cn("text-muted-foreground hover:text-foreground", className)}
          aria-label="Send reaction"
        >
          <Smile className="h-5 w-5" />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2" 
        align="center"
        side="top"
      >
        <div className="flex gap-1">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="flex h-10 w-10 items-center justify-center rounded-md text-2xl transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});
ReactionPicker.displayName = "ReactionPicker";
