import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

/**
 * Phase 6: Media error classification tests.
 */

type MediaStreamError =
  | "permission-denied"
  | "device-not-found"
  | "device-busy"
  | "unknown";

function classifyMediaError(err: unknown): MediaStreamError {
  if (!(err instanceof Error)) return "unknown";

  const name = (err as DOMException).name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "permission-denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "device-not-found";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "device-busy";
  }
  return "unknown";
}

// Mock DOMException for testing
class MockDOMException extends Error {
  override name: string;
  constructor(message: string, name: string) {
    super(message);
    this.name = name;
  }
}

describe("Media error classification", () => {
  it("classifies NotAllowedError as permission-denied", () => {
    const err = new MockDOMException("Permission denied", "NotAllowedError");
    assert.equal(classifyMediaError(err), "permission-denied");
  });

  it("classifies PermissionDeniedError as permission-denied", () => {
    const err = new MockDOMException("Permission denied", "PermissionDeniedError");
    assert.equal(classifyMediaError(err), "permission-denied");
  });

  it("classifies NotFoundError as device-not-found", () => {
    const err = new MockDOMException("Device not found", "NotFoundError");
    assert.equal(classifyMediaError(err), "device-not-found");
  });

  it("classifies DevicesNotFoundError as device-not-found", () => {
    const err = new MockDOMException("Devices not found", "DevicesNotFoundError");
    assert.equal(classifyMediaError(err), "device-not-found");
  });

  it("classifies NotReadableError as device-busy", () => {
    const err = new MockDOMException("Device busy", "NotReadableError");
    assert.equal(classifyMediaError(err), "device-busy");
  });

  it("classifies TrackStartError as device-busy", () => {
    const err = new MockDOMException("Track start failed", "TrackStartError");
    assert.equal(classifyMediaError(err), "device-busy");
  });

  it("classifies unknown error names as unknown", () => {
    const err = new MockDOMException("Unknown error", "WeirdError");
    assert.equal(classifyMediaError(err), "unknown");
  });

  it("classifies non-Error objects as unknown", () => {
    assert.equal(classifyMediaError("string error"), "unknown");
    assert.equal(classifyMediaError(null), "unknown");
    assert.equal(classifyMediaError(undefined), "unknown");
    assert.equal(classifyMediaError({ foo: "bar" }), "unknown");
  });
});
