/**
 * Embed widget component — use for iframe embedding.
 * 
 * Usage:
 * <iframe 
 *   src="https://sudomeet-v1.vercel.app/embed/room-code"
 *   width="100%"
 *   height="600"
 *   allow="camera; microphone; display-capture"
 * ></iframe>
 */

export function EmbedWidget() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">
        Embed widget — Phase 13 minimal implementation
      </p>
    </div>
  );
}
