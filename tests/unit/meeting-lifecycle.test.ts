import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  transition,
  isActive,
  isTerminal,
  computeExpiry,
} from "@/features/meetings/lifecycle";

describe("meeting-lifecycle", () => {
  describe("transition", () => {
    it("allows DRAFT → SCHEDULED via schedule", () => {
      const result = transition("DRAFT", "schedule");
      assert.deepStrictEqual(result, { ok: true, next: "SCHEDULED" });
    });

    it("allows DRAFT → ACTIVE via start", () => {
      const result = transition("DRAFT", "start");
      assert.deepStrictEqual(result, { ok: true, next: "ACTIVE" });
    });

    it("allows DRAFT → WAITING via wait", () => {
      const result = transition("DRAFT", "wait");
      assert.deepStrictEqual(result, { ok: true, next: "WAITING" });
    });

    it("allows SCHEDULED → ACTIVE via start", () => {
      const result = transition("SCHEDULED", "start");
      assert.deepStrictEqual(result, { ok: true, next: "ACTIVE" });
    });

    it("allows WAITING → ACTIVE via join", () => {
      const result = transition("WAITING", "join");
      assert.deepStrictEqual(result, { ok: true, next: "ACTIVE" });
    });

    it("allows ACTIVE → ENDED via end", () => {
      const result = transition("ACTIVE", "end");
      assert.deepStrictEqual(result, { ok: true, next: "ENDED" });
    });

    it("allows WAITING → ENDED via end", () => {
      const result = transition("WAITING", "end");
      assert.deepStrictEqual(result, { ok: true, next: "ENDED" });
    });

    it("allows DRAFT → EXPIRED via expire", () => {
      const result = transition("DRAFT", "expire");
      assert.deepStrictEqual(result, { ok: true, next: "EXPIRED" });
    });

    it("allows SCHEDULED → EXPIRED via expire", () => {
      const result = transition("SCHEDULED", "expire");
      assert.deepStrictEqual(result, { ok: true, next: "EXPIRED" });
    });

    it("allows WAITING → EXPIRED via expire", () => {
      const result = transition("WAITING", "expire");
      assert.deepStrictEqual(result, { ok: true, next: "EXPIRED" });
    });

    it("allows ACTIVE → EXPIRED via expire", () => {
      const result = transition("ACTIVE", "expire");
      assert.deepStrictEqual(result, { ok: true, next: "EXPIRED" });
    });

    it("forbids end on DRAFT", () => {
      const result = transition("DRAFT", "end");
      assert.strictEqual(result.ok, false);
      assert.ok("reason" in result);
    });

    it("forbids start on ENDED", () => {
      const result = transition("ENDED", "start");
      assert.strictEqual(result.ok, false);
    });

    it("forbids any event on EXPIRED", () => {
      const events: Array<Parameters<typeof transition>[1]> = [
        "create",
        "schedule",
        "start",
        "wait",
        "join",
        "end",
        "expire",
      ];
      events.forEach((event) => {
        const result = transition("EXPIRED", event);
        assert.strictEqual(result.ok, false);
      });
    });
  });

  describe("isActive", () => {
    it("returns true only for ACTIVE status", () => {
      assert.strictEqual(isActive("ACTIVE"), true);
      assert.strictEqual(isActive("DRAFT"), false);
      assert.strictEqual(isActive("SCHEDULED"), false);
      assert.strictEqual(isActive("WAITING"), false);
      assert.strictEqual(isActive("ENDED"), false);
      assert.strictEqual(isActive("EXPIRED"), false);
    });
  });

  describe("isTerminal", () => {
    it("returns true for ENDED and EXPIRED", () => {
      assert.strictEqual(isTerminal("ENDED"), true);
      assert.strictEqual(isTerminal("EXPIRED"), true);
    });

    it("returns false for non-terminal states", () => {
      assert.strictEqual(isTerminal("DRAFT"), false);
      assert.strictEqual(isTerminal("SCHEDULED"), false);
      assert.strictEqual(isTerminal("WAITING"), false);
      assert.strictEqual(isTerminal("ACTIVE"), false);
    });
  });

  describe("computeExpiry", () => {
    const now = new Date("2026-08-25T12:00:00Z");

    it("returns expired:false when expiresAt is null", () => {
      const result = computeExpiry("ACTIVE", null, now);
      assert.deepStrictEqual(result, { expired: false });
    });

    it("returns expired:false when expiresAt is in the future", () => {
      const future = new Date("2026-08-25T13:00:00Z");
      const result = computeExpiry("ACTIVE", future, now);
      assert.deepStrictEqual(result, { expired: false });
    });

    it("returns expired:true when expiresAt has passed (ACTIVE)", () => {
      const past = new Date("2026-08-25T11:00:00Z");
      const result = computeExpiry("ACTIVE", past, now);
      assert.deepStrictEqual(result, { expired: true, next: "EXPIRED" });
    });

    it("returns expired:true when expiresAt has passed (DRAFT)", () => {
      const past = new Date("2026-08-25T11:00:00Z");
      const result = computeExpiry("DRAFT", past, now);
      assert.deepStrictEqual(result, { expired: true, next: "EXPIRED" });
    });

    it("returns expired:false for terminal states even if expiresAt passed", () => {
      const past = new Date("2026-08-25T11:00:00Z");
      assert.deepStrictEqual(computeExpiry("ENDED", past, now), { expired: false });
      assert.deepStrictEqual(computeExpiry("EXPIRED", past, now), { expired: false });
    });
  });
});
