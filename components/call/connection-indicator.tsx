"use client";

import * as React from "react";
import { SignalHigh, SignalMedium, SignalLow, SignalZero } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

type ConnectionQuality = "excellent" | "good" | "poor" | "disconnected";

interface ConnectionIndicatorProps {
  quality: ConnectionQuality;
  className?: string;
}

export const ConnectionIndicator = React.forwardRef<
  HTMLDivElement,
  ConnectionIndicatorProps
>(({ quality, className }, ref) => {
  const getIcon = () => {
    switch (quality) {
      case "excellent":
        return <SignalHigh className="h-4 w-4 text-success" />;
      case "good":
        return <SignalMedium className="h-4 w-4 text-warning" />;
      case "poor":
        return <SignalLow className="h-4 w-4 text-destructive" />;
      case "disconnected":
        return <SignalZero className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLabel = () => {
    switch (quality) {
      case "excellent":
        return "Connection: Excellent";
      case "good":
        return "Connection: Good";
      case "poor":
        return "Connection: Poor";
      case "disconnected":
        return "Connection: Disconnected";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={ref}
            className={cn(
              "inline-flex items-center justify-center rounded-lg bg-background-elevated/80 backdrop-blur-sm p-2",
              className
            )}
          >
            {getIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getLabel()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
ConnectionIndicator.displayName = "ConnectionIndicator";
