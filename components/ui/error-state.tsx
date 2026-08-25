import * as React from "react";
import { AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: "error" | "warning";
}

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      className,
      title,
      message,
      onRetry,
      variant = "error",
      ...props
    },
    ref
  ) => {
    const Icon = variant === "error" ? XCircle : AlertCircle;
    const iconColor =
      variant === "error" ? "text-destructive" : "text-warning";

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "mb-4 rounded-xl bg-background-subtle p-4",
            iconColor
          )}
        >
          <Icon className="h-8 w-8" />
        </div>
        {title && <h3 className="mb-1 text-lg font-semibold">{title}</h3>}
        <p className="mb-4 text-sm text-muted-foreground max-w-sm">
          {message}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            Try Again
          </Button>
        )}
      </div>
    );
  }
);
ErrorState.displayName = "ErrorState";

export { ErrorState };
