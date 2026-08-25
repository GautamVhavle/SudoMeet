"use client";

import * as React from "react";
import { Check, Copy, Share2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface InviteDialogProps {
  roomCode: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Share sheet for the room link. Uses the native share sheet where available
 * (phones), otherwise falls back to clipboard copy.
 */
export function InviteDialog({
  roomCode,
  title,
  open,
  onOpenChange,
}: InviteDialogProps) {
  const [copied, setCopied] = React.useState(false);
  const [canNativeShare, setCanNativeShare] = React.useState(false);
  const [joinUrl, setJoinUrl] = React.useState("");

  React.useEffect(() => {
    setJoinUrl(`${window.location.origin}/m/${roomCode}`);
    setCanNativeShare(typeof navigator.share === "function");
  }, [roomCode]);

  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
    } catch {
      // Clipboard is blocked on insecure origins — the input is selectable.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [joinUrl]);

  const share = React.useCallback(async () => {
    try {
      await navigator.share({
        title: `Join "${title}" on SudoMeet`,
        text: `Join my meeting: ${title}`,
        url: joinUrl,
      });
    } catch {
      // User dismissed the share sheet.
    }
  }, [joinUrl, title]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>
            Anyone with this link can join — no account needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={joinUrl}
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Meeting link"
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background-subtle px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              onClick={() => void copy()}
              variant={copied ? "secondary" : "default"}
              className="shrink-0"
            >
              {copied ? (
                <Check className="mr-2 size-4" />
              ) : (
                <Copy className="mr-2 size-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-background-subtle p-3">
            <p className="text-xs text-muted-foreground">Room code</p>
            <p className="font-mono text-lg font-semibold tracking-wide text-foreground">
              {roomCode}
            </p>
          </div>

          {canNativeShare && (
            <Button variant="outline" className="w-full" onClick={() => void share()}>
              <Share2 className="mr-2 size-4" />
              Share via…
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Header button that opens the invite sheet. */
export function InviteButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={onClick}
      className={cn("shrink-0", className)}
    >
      <UserPlus className="size-4 sm:mr-2" />
      <span className="hidden sm:inline">Invite</span>
    </Button>
  );
}
