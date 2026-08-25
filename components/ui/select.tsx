"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// TODO Phase 6: Implement select with @radix-ui/react-select or native select
// For now, using a simple native select wrapper

const Select = ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
  <div {...props}>{children}</div>
);

const SelectGroup = ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
  <div {...props}>{children}</div>
);

const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>;

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & { children: React.ReactNode }
>(({ className, children, disabled, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    disabled={disabled}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
  </button>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
  <div {...props}>{children}</div>
);

const SelectLabel = ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
  <div {...props}>{children}</div>
);

const SelectItem = ({ children, value, ...props }: React.ComponentPropsWithoutRef<"div"> & { value: string }) => (
  <div data-value={value} {...props}>
    {children}
  </div>
);

const SelectSeparator = (props: React.ComponentPropsWithoutRef<"div">) => (
  <div {...props} />
);

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
