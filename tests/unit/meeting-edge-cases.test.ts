import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCreateMeetingRequest, parseUpdateMeetingRequest } from "@/lib/validation/meetings";

describe("meeting edge cases", () => {
  describe("capacity validation", () => {
    it("accepts maxParticipants within [2, 8]", () => {
      const result2 = parseCreateMeetingRequest({ title: "Test", maxParticipants: 2 });
      assert.strictEqual(result2.success, true);

      const result8 = parseCreateMeetingRequest({ title: "Test", maxParticipants: 8 });
      assert.strictEqual(result8.success, true);
    });

    it("rejects maxParticipants below 2", () => {
      const result = parseCreateMeetingRequest({ title: "Test", maxParticipants: 1 });
      assert.strictEqual(result.success, false);
    });

    it("rejects maxParticipants above 8", () => {
      const result = parseCreateMeetingRequest({ title: "Test", maxParticipants: 9 });
      assert.strictEqual(result.success, false);
    });

    it("defaults maxParticipants when omitted (schema allows optional)", () => {
      const result = parseCreateMeetingRequest({ title: "Test" });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.maxParticipants, undefined); // caller defaults to 4
      }
    });
  });

  describe("lock/unlock validation", () => {
    it("accepts isLocked boolean in update", () => {
      const lockResult = parseUpdateMeetingRequest({ isLocked: true });
      assert.strictEqual(lockResult.success, true);

      const unlockResult = parseUpdateMeetingRequest({ isLocked: false });
      assert.strictEqual(unlockResult.success, true);
    });

    it("allows title-only update", () => {
      const result = parseUpdateMeetingRequest({ title: "New Title" });
      assert.strictEqual(result.success, true);
    });

    it("allows lock-only update", () => {
      const result = parseUpdateMeetingRequest({ isLocked: true });
      assert.strictEqual(result.success, true);
    });

    it("rejects empty update (no title, no isLocked)", () => {
      const result = parseUpdateMeetingRequest({});
      assert.strictEqual(result.success, false);
    });
  });

  describe("title validation", () => {
    it("trims whitespace", () => {
      const result = parseCreateMeetingRequest({ title: "  Padded  " });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.title, "Padded");
      }
    });

    it("rejects empty title after trim", () => {
      const result = parseCreateMeetingRequest({ title: "   " });
      assert.strictEqual(result.success, false);
    });

    it("enforces max length 120", () => {
      const long = "a".repeat(121);
      const result = parseCreateMeetingRequest({ title: long });
      assert.strictEqual(result.success, false);
    });

    it("accepts title exactly at 120 chars", () => {
      const exactly = "a".repeat(120);
      const result = parseCreateMeetingRequest({ title: exactly });
      assert.strictEqual(result.success, true);
    });
  });

  describe("expiry logic (via lifecycle)", () => {
    // Expiry is tested in meeting-lifecycle.test.ts; this confirms schema integration.
    it("does not expose expiresAt in client schemas", () => {
      // The create/update schemas don't include expiresAt — it's server-only.
      const result = parseCreateMeetingRequest({ title: "Test", expiresAt: "2026-09-01" } as never);
      assert.strictEqual(result.success, true);
      // Zod .strict() not used, so extra keys are ignored; we rely on TS types.
    });
  });
});
