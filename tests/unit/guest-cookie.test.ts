import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { GuestIdentity } from "@/lib/validation/auth";

/**
 * Phase 6: Guest identity parsing tests.
 */

function parseGuestCookie(cookieValue: string): GuestIdentity | null {
  try {
    const decoded = decodeURIComponent(cookieValue);
    const identity = JSON.parse(decoded) as GuestIdentity;

    // Basic shape validation
    if (
      identity.kind === "guest" &&
      typeof identity.guestId === "string" &&
      typeof identity.displayName === "string"
    ) {
      return identity;
    }

    return null;
  } catch {
    return null;
  }
}

describe("Guest identity cookie parsing", () => {
  it("parses valid guest identity cookie", () => {
    const identity: GuestIdentity = {
      kind: "guest",
      guestId: "test-id-123",
      displayName: "Alice",
      createdAt: new Date().toISOString(),
    };
    const encoded = encodeURIComponent(JSON.stringify(identity));
    const parsed = parseGuestCookie(encoded);

    assert.ok(parsed);
    assert.equal(parsed.kind, "guest");
    assert.equal(parsed.guestId, "test-id-123");
    assert.equal(parsed.displayName, "Alice");
  });

  it("returns null for malformed JSON", () => {
    const malformed = encodeURIComponent("{invalid json}");
    assert.equal(parseGuestCookie(malformed), null);
  });

  it("returns null for non-guest kind", () => {
    const notGuest = encodeURIComponent(
      JSON.stringify({ kind: "user", userId: "123" })
    );
    assert.equal(parseGuestCookie(notGuest), null);
  });

  it("returns null for missing fields", () => {
    const incomplete = encodeURIComponent(
      JSON.stringify({ kind: "guest", guestId: "123" })
    );
    assert.equal(parseGuestCookie(incomplete), null);
  });

  it("returns null for empty string", () => {
    assert.equal(parseGuestCookie(""), null);
  });

  it("handles special characters in display name", () => {
    const identity: GuestIdentity = {
      kind: "guest",
      guestId: "test-id",
      displayName: "José María",
      createdAt: new Date().toISOString(),
    };
    const encoded = encodeURIComponent(JSON.stringify(identity));
    const parsed = parseGuestCookie(encoded);

    assert.ok(parsed);
    assert.equal(parsed.displayName, "José María");
  });
});
