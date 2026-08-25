import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

/**
 * Phase 6: Network quality classification tests.
 */

type NetworkQuality = "excellent" | "good" | "weak" | "unstable";

function classifyQuality(rtt: number): NetworkQuality {
  if (rtt < 100) return "excellent";
  if (rtt < 200) return "good";
  if (rtt < 400) return "weak";
  return "unstable";
}

describe("Network quality classification", () => {
  it("classifies RTT < 100ms as excellent", () => {
    assert.equal(classifyQuality(50), "excellent");
    assert.equal(classifyQuality(99), "excellent");
  });

  it("classifies RTT 100-199ms as good", () => {
    assert.equal(classifyQuality(100), "good");
    assert.equal(classifyQuality(150), "good");
    assert.equal(classifyQuality(199), "good");
  });

  it("classifies RTT 200-399ms as weak", () => {
    assert.equal(classifyQuality(200), "weak");
    assert.equal(classifyQuality(300), "weak");
    assert.equal(classifyQuality(399), "weak");
  });

  it("classifies RTT >= 400ms as unstable", () => {
    assert.equal(classifyQuality(400), "unstable");
    assert.equal(classifyQuality(500), "unstable");
    assert.equal(classifyQuality(1000), "unstable");
  });
});
