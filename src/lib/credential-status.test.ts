import { describe, expect, test } from "bun:test";

import { classifyCredentialStatus } from "./credential-status";

const BASE = {
  requestedVersion: 2,
  requestedKeyVersion: 3,
  requestedRevision: "revision-2",
  currentVersion: 2,
  currentKeyVersion: 3,
  currentRevision: "revision-2",
  agentStatus: "valid",
  expiresAt: "2027-01-01T00:00:00.000Z",
  now: Date.parse("2026-10-01T00:00:00.000Z"),
};

describe("version-aware credential status", () => {
  test("only the exact current version and revision is usable", () => {
    expect(classifyCredentialStatus(BASE)).toEqual({
      credentialStatus: "current",
      agentStatus: "valid",
      usable: true,
    });
  });

  test("an older mandate version is superseded", () => {
    expect(classifyCredentialStatus({ ...BASE, requestedVersion: 1 })).toMatchObject({
      credentialStatus: "superseded",
      usable: false,
    });
  });

  test("a changed signed-claim revision is superseded within the same mandate", () => {
    expect(
      classifyCredentialStatus({ ...BASE, requestedRevision: "older-owner-evidence" }),
    ).toMatchObject({ credentialStatus: "superseded", usable: false });
  });

  test("an unversioned legacy status URL fails closed", () => {
    expect(
      classifyCredentialStatus({ ...BASE, requestedVersion: null, requestedRevision: null }),
    ).toMatchObject({ credentialStatus: "legacy", usable: false });
  });

  test("an older agent key version is superseded independently of the mandate", () => {
    expect(classifyCredentialStatus({ ...BASE, requestedKeyVersion: 2 })).toMatchObject({
      credentialStatus: "superseded",
      usable: false,
    });
  });

  test("a legacy credential without key_version is current only while key v1 is current", () => {
    expect(
      classifyCredentialStatus({
        ...BASE,
        requestedKeyVersion: null,
        currentKeyVersion: 1,
      }),
    ).toMatchObject({ credentialStatus: "current", usable: true });
    expect(classifyCredentialStatus({ ...BASE, requestedKeyVersion: null })).toMatchObject({
      credentialStatus: "superseded",
      usable: false,
    });
  });

  test("a recovery hold blocks even the exact current credential", () => {
    expect(classifyCredentialStatus({ ...BASE, recoveryHold: true })).toEqual({
      credentialStatus: "current",
      agentStatus: "valid",
      usable: false,
    });
  });

  test("freeze is orthogonal and blocks the current credential", () => {
    expect(classifyCredentialStatus({ ...BASE, agentStatus: "frozen" })).toEqual({
      credentialStatus: "current",
      agentStatus: "frozen",
      usable: false,
    });
  });

  test("an expired current mandate cannot be used", () => {
    expect(
      classifyCredentialStatus({
        ...BASE,
        expiresAt: "2026-09-01T00:00:00.000Z",
      }),
    ).toEqual({ credentialStatus: "expired", agentStatus: "expired", usable: false });
  });
});
