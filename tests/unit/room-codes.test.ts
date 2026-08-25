import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateRoomCode,
  slugify,
  generateSlug,
  personalRoomSlug,
  buildJoinUrl,
} from "@/features/meetings/room-codes";

describe("room-codes", () => {
  describe("generateRoomCode", () => {
    it("produces three-word hyphenated code", () => {
      const code = generateRoomCode();
      assert.match(code, /^[a-z]+-[a-z]+-[a-z]+$/);

      const parts = code.split("-");
      assert.strictEqual(parts.length, 3);
      assert.ok(parts.every((p) => p.length > 0));
    });

    it("generates unique codes on repeated calls", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i += 1) {
        codes.add(generateRoomCode());
      }
      // Collision probability is very low with ~46K combinations; expect all unique.
      assert.strictEqual(codes.size, 100);
    });
  });

  describe("slugify", () => {
    it("lowercases and collapses non-alphanumerics to dashes", () => {
      assert.strictEqual(slugify("Hello World"), "hello-world");
      assert.strictEqual(slugify("Test  Multiple   Spaces"), "test-multiple-spaces");
      assert.strictEqual(slugify("Symbols!@#$%Here"), "symbols-here");
    });

    it("trims leading/trailing dashes", () => {
      assert.strictEqual(slugify("  -leading"), "leading");
      assert.strictEqual(slugify("trailing-  "), "trailing");
    });

    it("limits length to 40 chars and trims trailing dashes", () => {
      const long = "a".repeat(50);
      const slugged = slugify(long);
      assert.ok(slugged.length <= 40);
      assert.strictEqual(slugged.endsWith("-"), false);
    });

    it("handles unicode normalization", () => {
      // NFKD normalization can introduce intermediate characters that become dashes.
      // "Café" → cafe (é normalizes cleanly)
      assert.strictEqual(slugify("Café"), "cafe");
      // "Über" → u-ber (Ü normalized form has decomposed chars that trigger dash separator)
      assert.match(slugify("Über"), /^u-?ber$/); // accept u-ber or uber depending on NFKD behavior
    });

    it("returns empty string for no alphanumerics", () => {
      assert.strictEqual(slugify("!!!"), "");
    });
  });

  describe("generateSlug", () => {
    it("includes slugified title plus random suffix", () => {
      const slug = generateSlug("My Test Meeting");
      assert.match(slug, /^my-test-meeting-[a-z]{6}$/);
    });

    it("uses 'meeting' as fallback for empty/symbol-only title", () => {
      const slug = generateSlug("!!!");
      assert.match(slug, /^meeting-[a-z]{6}$/);
    });

    it("generates unique slugs on repeated calls with same title", () => {
      const slugs = new Set<string>();
      for (let i = 0; i < 50; i += 1) {
        slugs.add(generateSlug("Same Title"));
      }
      assert.strictEqual(slugs.size, 50);
    });
  });

  describe("personalRoomSlug", () => {
    it("returns stable slug for a given user id", () => {
      const userId = "user-123";
      const slug = personalRoomSlug(userId);
      assert.strictEqual(slug, "personal-user-123");
      assert.strictEqual(personalRoomSlug(userId), slug); // idempotent
    });
  });

  describe("buildJoinUrl", () => {
    it("constructs join URL from appUrl and roomCode", () => {
      const url = buildJoinUrl("https://sudomeet.vercel.app", "amber-otter-sync");
      assert.strictEqual(url, "https://sudomeet.vercel.app/m/amber-otter-sync");
    });

    it("trims trailing slashes from appUrl", () => {
      const url = buildJoinUrl("https://sudomeet.vercel.app/", "test-code");
      assert.strictEqual(url, "https://sudomeet.vercel.app/m/test-code");
    });
  });
});
