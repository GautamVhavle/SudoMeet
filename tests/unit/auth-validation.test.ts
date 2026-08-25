import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  guestJoinSchema,
  magicLinkSchema,
  parseGuestJoinRequest,
} from "../../lib/validation/auth";
import { resolveEntryPath } from "../../features/auth/guest-flow";

describe("magicLinkSchema", () => {
  it("accepts and normalizes a valid email", () => {
    const result = magicLinkSchema.parse({ email: "  Dev@Example.COM " });
    assert.equal(result.email, "dev@example.com");
  });

  it("rejects invalid emails", () => {
    for (const bad of ["not-an-email", "", "a@b", "a b@c.com"]) {
      assert.equal(magicLinkSchema.safeParse({ email: bad }).success, false, bad);
    }
  });
});

describe("guestJoinSchema / parseGuestJoinRequest", () => {
  it("accepts names within bounds and trims whitespace", () => {
    const parsed = parseGuestJoinRequest({ name: "  Gautam  " });
    assert.deepEqual(parsed, { success: true, data: { name: "Gautam" } });
  });

  it("rejects too-short, too-long, whitespace-only and non-string names", () => {
    assert.equal(parseGuestJoinRequest({ name: "a" }).success, false);
    assert.equal(parseGuestJoinRequest({ name: "x".repeat(33) }).success, false);
    assert.equal(parseGuestJoinRequest({ name: "   " }).success, false);
    assert.equal(parseGuestJoinRequest({ name: 42 }).success, false);
    assert.equal(parseGuestJoinRequest({}).success, false);
  });

  it("schema matches its inferred type contract", () => {
    const direct = guestJoinSchema.safeParse({ name: "Ada" });
    assert.equal(direct.success, true);
  });
});

describe("resolveEntryPath (guest flow branch)", () => {
  it("authenticated users go straight to join", () => {
    assert.deepEqual(resolveEntryPath({ isAuthenticated: true, userId: "u_1" }), {
      action: "join",
      userId: "u_1",
    });
  });

  it("unauthenticated visitors are asked to enter a name", () => {
    assert.deepEqual(resolveEntryPath({ isAuthenticated: false }), {
      action: "enter-name",
    });
  });

  it("treats an authenticated-but-idless session as unauthenticated", () => {
    assert.deepEqual(resolveEntryPath({ isAuthenticated: true, userId: null }), {
      action: "enter-name",
    });
  });
});
