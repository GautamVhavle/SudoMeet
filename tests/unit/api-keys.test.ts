import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  API_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
} from "../../lib/api/keys";

describe("generateApiKey", () => {
  it("uses the sudomeet_live_ prefix constant", () => {
    const { key } = generateApiKey();
    assert.ok(key.startsWith(`${API_KEY_PREFIX}_`));
  });

  it("generates unique keys", () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey().key));
    assert.equal(keys.size, 100);
  });

  it("returns prefix + sha256 hash, never the raw key in stored fields", () => {
    const { key, keyPrefix, hashedSecret } = generateApiKey();
    assert.ok(key.startsWith(keyPrefix));
    assert.notEqual(keyPrefix, key);
    assert.match(hashedSecret, /^[0-9a-f]{64}$/);
  });
});

describe("verifyApiKey", () => {
  it("accepts the correct key", () => {
    const { key, hashedSecret } = generateApiKey();
    assert.equal(verifyApiKey(key, hashedSecret), true);
  });

  it("rejects wrong keys", () => {
    const { hashedSecret } = generateApiKey();
    assert.equal(verifyApiKey("sudomeet_live_wrong", hashedSecret), false);
  });
});

describe("hashApiKey", () => {
  it("is deterministic", () => {
    assert.equal(hashApiKey("k"), hashApiKey("k"));
  });
});
