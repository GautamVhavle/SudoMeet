import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canJoinMeeting,
  canStartMeeting,
  canLockMeeting,
  canApproveParticipant,
  canRemoveParticipant,
  canMuteParticipant,
  canStartRecording,
  canCreateBreakoutRooms,
  isMeetingRole,
  type AuthorizationContext,
} from "../../lib/auth/permissions";

const ALL_ROLES = ["OWNER", "HOST", "CO_HOST", "PARTICIPANT", "GUEST"] as const;

describe("isMeetingRole", () => {
  it("accepts valid roles", () => {
    for (const role of ALL_ROLES) assert.equal(isMeetingRole(role), true);
  });

  it("rejects invalid roles", () => {
    assert.equal(isMeetingRole("ADMIN"), false);
    assert.equal(isMeetingRole(42), false);
    assert.equal(isMeetingRole(null), false);
  });
});

describe("canJoinMeeting", () => {
  it("allows every role into an open meeting", () => {
    for (const role of ALL_ROLES) {
      assert.equal(canJoinMeeting(role), true, `${role} should join open meeting`);
    }
  });

  it("blocks non-staff when locked, staff always enter", () => {
    const locked: AuthorizationContext = { isLocked: true };
    assert.equal(canJoinMeeting("PARTICIPANT", locked), false);
    assert.equal(canJoinMeeting("GUEST", locked), false);
    assert.equal(canJoinMeeting("OWNER", locked), true);
    assert.equal(canJoinMeeting("HOST", locked), true);
    assert.equal(canJoinMeeting("CO_HOST", locked), true);
  });

  it("requires approval for guests only when requiresHostApproval", () => {
    const approval: AuthorizationContext = { requiresHostApproval: true };
    assert.equal(canJoinMeeting("GUEST", approval), false);
    assert.equal(canJoinMeeting("PARTICIPANT", approval), true);
    assert.equal(canJoinMeeting("GUEST"), true); // no gate configured
  });

  it("rejects everyone once ended", () => {
    const ended: AuthorizationContext = { isEnded: true };
    for (const role of ALL_ROLES) {
      assert.equal(canJoinMeeting(role, ended), false, `${role} must not join ended`);
    }
  });
});

describe("canStartMeeting / canLockMeeting (owner+host only)", () => {
  it("permits OWNER and HOST only", () => {
    for (const fn of [canStartMeeting, canLockMeeting]) {
      assert.equal(fn("OWNER"), true);
      assert.equal(fn("HOST"), true);
      assert.equal(fn("CO_HOST"), false);
      assert.equal(fn("PARTICIPANT"), false);
      assert.equal(fn("GUEST"), false);
    }
  });

  it("cannot start an already-started or ended meeting", () => {
    assert.equal(canStartMeeting("HOST", { isStarted: true }), false);
    assert.equal(canStartMeeting("OWNER", { isEnded: true }), false);
    assert.equal(canLockMeeting("OWNER", { isEnded: true }), false);
  });
});

describe("staff actions (approve/remove/mute)", () => {
  it("allows all staff roles and denies participants/guests", () => {
    for (const fn of [canApproveParticipant, canRemoveParticipant, canMuteParticipant]) {
      assert.equal(fn("OWNER"), true);
      assert.equal(fn("HOST"), true);
      assert.equal(fn("CO_HOST"), true);
      assert.equal(fn("PARTICIPANT"), false);
      assert.equal(fn("GUEST"), false);
      assert.equal(fn("GUEST", { isEnded: true }), false);
    }
  });
});

describe("canStartRecording / canCreateBreakoutRooms (owner+host only)", () => {
  it("permits OWNER and HOST only", () => {
    for (const fn of [canStartRecording, canCreateBreakoutRooms]) {
      assert.equal(fn("OWNER"), true);
      assert.equal(fn("HOST"), true);
      assert.equal(fn("CO_HOST"), false);
      assert.equal(fn("PARTICIPANT"), false);
      assert.equal(fn("GUEST"), false);
    }
  });

  it("recording cannot start twice", () => {
    assert.equal(canStartRecording("HOST", { isRecording: true }), false);
    assert.equal(canStartRecording("HOST", { isRecording: false }), true);
  });
});
