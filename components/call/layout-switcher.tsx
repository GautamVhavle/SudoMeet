"use client";

import * as React from "react";
import { Grid3x3, Maximize2, Sidebar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayoutStore, type LayoutMode } from "@/stores/layout";
import { IconButton } from "../ui/icon-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface LayoutSwitcherProps {
  className?: string;
}

/**
 * Layout switcher — toggle between grid, spotlight, and sidebar layouts.
 */
export const LayoutSwitcher = React.forwardRef<HTMLDivElement, LayoutSwitcherProps>(
  ({ className }, ref) => {
    const mode = useLayoutStore((state) => state.mode);
    const setMode = useLayoutStore((state) => state.setMode);

    const layouts: Array<{
      mode: LayoutMode;
      icon: React.ReactNode;
      label: string;
    }> = [
      {
        mode: "grid",
        icon: <Grid3x3 className="h-4 w-4" />,
        label: "Grid",
      },
      {
        mode: "spotlight",
        icon: <Maximize2 className="h-4 w-4" />,
        label: "Spotlight",
      },
      {
        mode: "sidebar",
        icon: <Sidebar className="h-4 w-4" />,
        label: "Sidebar",
      },
    ];

    return (
      <TooltipProvider>
        <div
          ref={ref}
          className={cn(
            "flex items-center gap-1 bg-background-elevated border border-border rounded-lg p-1",
            className
          )}
        >
          {layouts.map((layout) => (
            <Tooltip key={layout.mode}>
              <TooltipTrigger asChild>
                <IconButton
                  variant={mode === layout.mode ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMode(layout.mode)}
                  aria-label={layout.label}
                  className={cn(
                    "transition-colors",
                    mode === layout.mode && "bg-accent text-accent-foreground"
                  )}
                >
                  {layout.icon}
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>{layout.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }
);
LayoutSwitcher.displayName = "LayoutSwitcher";
