/**
 * Markdown rendering and sanitization utilities for chat messages.
 *
 * Supports code blocks with syntax highlighting, inline code, links, and lists.
 * Uses strict sanitization to prevent XSS attacks.
 */

import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

/**
 * Configure marked for secure, developer-friendly rendering.
 */
marked.setOptions({
  breaks: true, // GitHub-style line breaks
  gfm: true, // GitHub Flavored Markdown
});

/**
 * Allowed HTML tags and attributes after markdown conversion.
 * Strict whitelist to prevent XSS while preserving code block structure.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "code",
  "pre",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
];

/**
 * Render markdown to sanitized HTML.
 *
 * @param markdown - Raw markdown string from user input
 * @returns Sanitized HTML safe for dangerouslySetInnerHTML
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown.trim()) return "";

  // Convert markdown to HTML
  const rawHtml = marked.parse(markdown, { async: false }) as string;

  // Sanitize HTML with strict whitelist
  const clean = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ADD_ATTR: ["target", "rel"], // Allow target and rel on <a> tags
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });

  return clean;
}

/**
 * Extract language from code fence for syntax highlighting.
 *
 * Example: ```typescript → "typescript"
 */
export function extractCodeLanguage(markdown: string): string | null {
  const match = /^```(\w+)/.exec(markdown.trim());
  return match?.[1] ?? null;
}

/**
 * Check if message contains code blocks.
 */
export function hasCodeBlock(markdown: string): boolean {
  return /```[\s\S]*?```/.test(markdown);
}

/**
 * Check if message is primarily a code snippet (for terminal-style formatting).
 */
export function isPrimarylyCode(markdown: string): boolean {
  const trimmed = markdown.trim();
  // Message starts and ends with code fence
  return trimmed.startsWith("```") && trimmed.endsWith("```");
}

/**
 * Format JSON content with proper indentation.
 * Returns formatted JSON if valid, original string otherwise.
 */
export function tryFormatJSON(text: string): string {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
}
