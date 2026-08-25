/**
 * Media provider factory — selects P2P or LiveKit based on meeting configuration.
 *
 * This is the seam where the call UI chooses its media engine at runtime.
 * The rest of the call UI depends ONLY on the MediaProvider interface and must
 * work with either provider.
 *
 * See docs/adr/ADR-001-media-provider-abstraction.md.
 */

import type { MediaProvider } from "./types";
import { P2PMediaProvider } from "./p2p/p2p-provider";
import type { P2PMediaProviderConfig } from "./p2p/p2p-provider";
import { LiveKitMediaProvider } from "./livekit/livekit-provider";

export type ProviderType = "p2p" | "livekit";

/**
 * Configuration for creating a media provider.
 */
export interface MediaProviderFactoryConfig {
  /** Which provider to use (from meeting.mediaProvider or env flag). */
  provider: ProviderType;
  /** Meeting ID. */
  meetingId: string;
  /** Local participant stable ID. */
  localParticipantId: string;
  /** Local participant display name. */
  localParticipantName: string;
  /** P2P-specific config (required if provider is "p2p"). */
  p2p?: {
    onSignalEvent: P2PMediaProviderConfig["onSignalEvent"];
  };
  /** LiveKit-specific config (required if provider is "livekit"). */
  livekit?: {
    livekitUrl: string;
    token: string;
  };
}

/**
 * Create a media provider instance based on configuration.
 *
 * @throws {Error} if required config for the selected provider is missing
 */
export function createMediaProvider(config: MediaProviderFactoryConfig): MediaProvider {
  const { provider, meetingId, localParticipantId, localParticipantName } = config;

  switch (provider) {
    case "p2p": {
      if (!config.p2p) {
        throw new Error(
          "P2P provider selected but p2p config is missing (onSignalEvent required)",
        );
      }

      return new P2PMediaProvider({
        meetingId,
        localParticipantId,
        localParticipantName,
        onSignalEvent: config.p2p.onSignalEvent,
      });
    }

    case "livekit": {
      if (!config.livekit) {
        throw new Error(
          "LiveKit provider selected but livekit config is missing (livekitUrl, token required)",
        );
      }

      return new LiveKitMediaProvider({
        meetingId,
        localParticipantId,
        localParticipantName,
        livekitUrl: config.livekit.livekitUrl,
        token: config.livekit.token,
      });
    }

    default: {
      const exhaustive: never = provider;
      throw new Error(`Unknown media provider: ${exhaustive}`);
    }
  }
}

/**
 * Determine which provider to use based on env flag or meeting configuration.
 *
 * Priority:
 * 1. Meeting's mediaProvider field (from DB)
 * 2. MEDIA_PROVIDER env var (global default)
 * 3. Fallback to P2P
 */
export function selectProvider(meetingProvider?: "P2P" | "LIVEKIT" | null): ProviderType {
  if (meetingProvider === "LIVEKIT") return "livekit";
  if (meetingProvider === "P2P") return "p2p";

  // Check env flag
  const envProvider = process.env.MEDIA_PROVIDER?.toLowerCase();
  if (envProvider === "livekit") return "livekit";

  // Default to P2P
  return "p2p";
}
