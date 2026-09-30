import { describe, expect, test } from "bun:test";

import { classifyCredentialStatus } from "./credential-status";

const BASE = {
  requestedVersion: 2,
  requestedRevision: "revision-2",
  currentVersion: 2,
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
