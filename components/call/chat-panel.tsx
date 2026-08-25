"use client";

import * as React from "react";
import { Send, Copy, Check, AlertCircle, RefreshCw } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { renderMarkdown, hasCodeBlock } from "@/lib/chat/markdown";
import { useChat } from "@/hooks/use-chat";
import type { ChatMessage } from "@/stores/chat";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface ChatPanelProps {
  meetingId: string;
  currentUser?: {
    id: string;
    name: string;
    image?: string | null;
  };
  className?: string;
}

export const ChatPanel = React.forwardRef<HTMLDivElement, ChatPanelProps>(
  ({ meetingId, currentUser, className }, ref) => {
    const [inputValue, setInputValue] = React.useState("");
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);

    const { messages, isLoadingHistory, error, sendMessage, retryMessage, markAsRead } =
      useChat({
        meetingId,
        currentUser,
        autoFetch: true,
      });

    // Auto-scroll to bottom when new messages arrive (if already at bottom)
    const scrollToBottom = React.useCallback((smooth = true) => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    }, []);

    // Detect if user has scrolled up (disable auto-scroll)
    const handleScroll = React.useCallback(() => {
      if (!scrollContainerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);
    }, []);

    // Auto-scroll when messages change (if enabled)
    React.useEffect(() => {
      if (shouldAutoScroll) {
        scrollToBottom();
      }
    }, [messages, shouldAutoScroll, scrollToBottom]);

    // Mark as read when panel is visible
    React.useEffect(() => {
      markAsRead();
    }, [markAsRead]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim()) {
        sendMessage(inputValue);
        setInputValue("");
      }
    };

    const handleRetry = (message: ChatMessage) => {
      retryMessage(message);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col h-full bg-background-elevated border-l border-border",
          className,
        )}
      >
        {/* Header */}
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Chat</h2>
          {error && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{error}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {isLoadingHistory && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            // Display messages in reverse order (oldest first)
            [...messages].reverse().map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                isCurrentUser={msg.sender.id === currentUser?.id}
                onRetry={handleRetry}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message... (Markdown supported)"
              className="flex-1"
              disabled={!currentUser}
              maxLength={10000}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || !currentUser}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    );
  },
);

ChatPanel.displayName = "ChatPanel";

/**
 * Individual message item with markdown rendering.
 */
interface MessageItemProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onRetry: (message: ChatMessage) => void;
}

function MessageItem({ message, isCurrentUser, onRetry }: MessageItemProps) {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Extract code blocks for special rendering
  const codeBlockMatch = message.body.match(/```(\w+)?\n([\s\S]*?)```/);
  const hasCode = hasCodeBlock(message.body);

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={message.sender.image ?? undefined} alt={message.sender.name} />
        <AvatarFallback className="text-xs">
          {initials(message.sender.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-medium">
            {message.sender.name}
            {isCurrentUser && " (You)"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
          {message.status === "sending" && (
            <span className="text-xs text-muted-foreground">Sending...</span>
          )}
          {message.status === "failed" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onRetry(message)}
                  className="text-xs text-destructive hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Failed - Retry
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Click to resend</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Message body with markdown rendering */}
        {hasCode && codeBlockMatch ? (
          <div className="space-y-2">
            {/* Render text before code block */}
            {message.body.split("```")[0] && (
              <div
                className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(message.body.split("```")[0]),
                }}
              />
            )}

            {/* Code block with syntax highlighting */}
            <div className="relative group">
              <SyntaxHighlighter
                language={codeBlockMatch[1] || "text"}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              >
                {codeBlockMatch[2].trim()}
              </SyntaxHighlighter>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() =>
                  copyToClipboard(codeBlockMatch[2].trim(), message.id)
                }
              >
                {copiedCode === message.id ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Render text after code block */}
            {message.body.split("```")[2] && (
              <div
                className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(message.body.split("```")[2]),
                }}
              />
            )}
          </div>
        ) : (
          <div
            className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none break-words"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(message.body),
            }}
          />
        )}
      </div>
    </div>
  );
}

