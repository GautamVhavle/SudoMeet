/**
 * LiveKit token minting utilities.
 *
 * Server-side only — mints short-lived join tokens after verifying:
 * - Meeting exists
 * - User may join (permissions/locks/capacity)
 * - Participant identity
 */

import { AccessToken } from "livekit-server-sdk";

export interface TokenOptions {
  /** LiveKit server URL (e.g., wss://sudomeet.livekit.cloud) */
  livekitUrl: string;
  /** API key for signing tokens */
  apiKey: string;
  /** API secret for signing tokens */
  apiSecret: string;
  /** Room name (usually meeting.roomCode) */
  roomName: string;
  /** Participant identity (stable id, e.g., user.id or guest session id) */
  participantIdentity: string;
  /** Participant display name */
  participantName: string;
  /** Token expiration in seconds (default: 1 hour) */
  ttl?: number;
}

/**
 * Mint a LiveKit join token for a participant.
 *
 * @throws {Error} if token minting fails
 */
export async function mintLiveKitToken(options: TokenOptions): Promise<string> {
  const {
    apiKey,
    apiSecret,
    roomName,
    participantIdentity,
    participantName,
    ttl = 3600, // 1 hour default
  } = options;

  try {
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl,
    });

    // Grant permissions to join the room and publish/subscribe tracks
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true, // For chat/reactions via data channels
    });

    return await token.toJwt();
  } catch (error) {
    console.error("[mintLiveKitToken] Failed to mint token:", error);
    throw new Error("Failed to mint LiveKit token");
  }
}
