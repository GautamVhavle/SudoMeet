/**
 * Media provider abstraction — barrel exports.
 *
 * Import from this file to depend ONLY on the MediaProvider interface,
 * not on specific implementations (P2P or LiveKit).
 */

// Core types
export type {
  MediaProvider,
  MediaState,
  MediaTrackKind,
  MediaTrackChangeKind,
  TrackChangedEvent,
  CallParticipant,
  ParticipantCallback,
  TrackChangedCallback,
  SignalEvent,
} from "./types";

// State machine
export { MediaStateMachine } from "./state-machine";

// P2P provider (Tier A)
export { P2PMediaProvider } from "./p2p/p2p-provider";
export type { P2PMediaProviderConfig } from "./p2p/p2p-provider";

// LiveKit provider (Tier B)
export { LiveKitMediaProvider } from "./livekit/livekit-provider";
export type { LiveKitMediaProviderConfig } from "./livekit/livekit-provider";

// Provider factory
export { createMediaProvider, selectProvider } from "./provider-factory";
export type { MediaProviderFactoryConfig, ProviderType } from "./provider-factory";
