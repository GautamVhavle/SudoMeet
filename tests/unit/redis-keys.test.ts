import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isMeetingNamespace,
  pubsubChannel,
  redisKey,
} from "../../lib/redis";

describe("redisKey", () => {
  it("builds namespace:meetingId keys", () => {
    assert.equal(redisKey("presence", "abc123"), "presence:abc123");
    assert.equal(redisKey("signal", "abc123"), "signal:abc123");
    assert.equal(redisKey("events", "abc123"), "events:abc123");
    assert.equal(redisKey("chat", "abc123"), "chat:abc123");
    assert.equal(redisKey("reactions", "abc123"), "reactions:abc123");
  });

  it("appends suffixes with a colon", () => {
    assert.equal(redisKey("presence", "abc123", "user_1"), "presence:abc123:user_1");
  });

  it("keeps namespaces isolated per meeting", () => {
    assert.notEqual(
      redisKey("chat", "meeting_a"),
      redisKey("chat", "meeting_b"),
    );
  });
});

describe("pubsubChannel", () => {
  it("matches the key shape for pub/sub channels", () => {
    assert.equal(pubsubChannel("events", "abc123"), "events:abc123");
  });
});

describe("isMeetingNamespace", () => {
  it("accepts all five plan namespaces", () => {
    for (const ns of ["presence", "signal", "events", "chat", "reactions"]) {
      assert.equal(isMeetingNamespace(ns), true);
    }
  });

  it("rejects unknown namespaces", () => {
    assert.equal(isMeetingNamespace("bogus"), false);
    assert.equal(isMeetingNamespace(""), false);
  });
});
