import { describe, expect, test } from "bun:test";

import {
  agentKeyFingerprint,
  canonicalKeyChangeMaterial,
  keyChangeMaterialHash,
  keyChangeProofIsFresh,
  keyChangeProofParts,
  recentStrongAuthAt,
  signKeyChangeProof,
  verifyKeyChangeProof,
  type KeyChangeProofParts,
} from "./key-lifecycle";
import { generateAgentKeys, importAgentSecret } from "./keys";

const NOW = Date.parse("2026-10-01T00:00:00.000Z");

async function fixture() {
  const oldKey = await generateAgentKeys();
  const newKey = await generateAgentKeys();
  const parts = await keyChangeProofParts({
    requestId: "11111111-1111-4111-8111-111111111111",
    agentId: "inf_TEST-KEY1-AAAA",
    expectedVersion: 1,
    expectedFingerprint: await agentKeyFingerprint(oldKey.publicKey),
    newFingerprint: await agentKeyFingerprint(newKey.publicKey),
    mode: "rotate",
    disposition: "routine",
    reason: "Scheduled key hygiene",
    expiresAt: "2026-10-01T00:05:00.000Z",
  });
  const oldPrivate = await importAgentSecret(oldKey.secretKey);
  const newPrivate = await importAgentSecret(newKey.secretKey);
  return { oldKey, newKey, oldPrivate, newPrivate, parts };
}

describe("agent key encoding and fingerprints", () => {
  test("a generated private handoff imports and signs without changing its public fingerprint", async () => {
    const { newKey, newPrivate, parts } = await fixture();
    const signature = await signKeyChangeProof(newPrivate, "possession", parts);
    expect(await verifyKeyChangeProof(newKey.publicKey, signature, "possession", parts)).toBe(true);
    expect(await agentKeyFingerprint(newKey.publicKey)).toMatch(/^[0-9a-f]{64}$/);
  });

  test("malformed or wrong-format private keys fail before any request", async () => {
    await expect(importAgentSecret("not-a-key")).rejects.toThrow(/infsk_/);
    await expect(importAgentSecret("infsk_not base64")).rejects.toThrow(/base64|Ed25519/);
  });

  test("two keys have different fingerprints", async () => {
    const a = await generateAgentKeys();
    const b = await generateAgentKeys();
    expect(await agentKeyFingerprint(a.publicKey)).not.toBe(await agentKeyFingerprint(b.publicKey));
  });
});

describe("key transition proof", () => {
  test("old continuity and new possession use separate signature domains", async () => {
    const { oldKey, newKey, oldPrivate, newPrivate, parts } = await fixture();
    const continuity = await signKeyChangeProof(oldPrivate, "continuity", parts);
    const possession = await signKeyChangeProof(newPrivate, "possession", parts);

    expect(await verifyKeyChangeProof(oldKey.publicKey, continuity, "continuity", parts)).toBe(
      true,
    );
    expect(await verifyKeyChangeProof(newKey.publicKey, possession, "possession", parts)).toBe(
      true,
    );
    expect(await verifyKeyChangeProof(newKey.publicKey, possession, "continuity", parts)).toBe(
      false,
    );
    expect(await verifyKeyChangeProof(oldKey.publicKey, continuity, "possession", parts)).toBe(
      false,
    );
  });

  test("another old key cannot transfer the Agent ID", async () => {
    const { oldKey, newPrivate, parts } = await fixture();
    const attacker = await generateAgentKeys();
    const attackerPrivate = await importAgentSecret(attacker.secretKey);
    const forged = await signKeyChangeProof(attackerPrivate, "continuity", parts);
    expect(await verifyKeyChangeProof(oldKey.publicKey, forged, "continuity", parts)).toBe(false);

    const newProof = await signKeyChangeProof(newPrivate, "possession", parts);
    expect(await verifyKeyChangeProof(oldKey.publicKey, newProof, "continuity", parts)).toBe(false);
  });

  test("every security-relevant field is signed", async () => {
    const { oldKey, oldPrivate, parts } = await fixture();
    const signature = await signKeyChangeProof(oldPrivate, "continuity", parts);
    const changes: Array<KeyChangeProofParts> = [
      { ...parts, requestId: "22222222-2222-4222-8222-222222222222" },
      { ...parts, agentId: "inf_OTHER-KEY1-BBBB" },
      { ...parts, expectedVersion: 2 },
      { ...parts, expectedFingerprint: "a".repeat(64) },
      { ...parts, newFingerprint: "b".repeat(64) },
      { ...parts, mode: "recover", disposition: "lost" },
      { ...parts, reasonSha256: "c".repeat(64) },
      { ...parts, expiresAt: "2026-10-01T00:06:00.000Z" },
    ];
    for (const changed of changes) {
      expect(await verifyKeyChangeProof(oldKey.publicKey, signature, "continuity", changed)).toBe(
        false,
      );
    }
  });

  test("material is deterministic, newline-safe, and has a stable digest", async () => {
    const { parts } = await fixture();
    expect(canonicalKeyChangeMaterial(parts)).toBe(canonicalKeyChangeMaterial({ ...parts }));
    expect(await keyChangeMaterialHash(parts)).toMatch(/^[0-9a-f]{64}$/);
    expect(() => canonicalKeyChangeMaterial({ ...parts, agentId: "agent\nother" })).toThrow(
      /newline/,
    );
  });

  test("rotation and recovery dispositions cannot be confused", async () => {
    const { parts } = await fixture();
    expect(() => canonicalKeyChangeMaterial({ ...parts, disposition: "lost" })).toThrow(/routine/);
    expect(() =>
      canonicalKeyChangeMaterial({ ...parts, mode: "recover", disposition: "routine" }),
    ).toThrow(/lost or compromised/);
  });

  test("proof freshness has an upper bound", () => {
    expect(keyChangeProofIsFresh("2026-10-01T00:05:00.000Z", NOW)).toBe(true);
    expect(keyChangeProofIsFresh("2026-09-30T23:59:59.000Z", NOW)).toBe(false);
    expect(keyChangeProofIsFresh("2026-10-01T00:11:00.000Z", NOW)).toBe(false);
  });
});

describe("recovery recent authentication", () => {
  test("accepts a recent interactive method", () => {
    expect(
      recentStrongAuthAt({ amr: [{ method: "password", timestamp: NOW / 1000 - 60 }] }, NOW),
    ).toBe("2026-09-30T23:59:00.000Z");
  });

  test("token refresh is never a recovery authorization", () => {
    expect(
      recentStrongAuthAt({ amr: [{ method: "token_refresh", timestamp: NOW / 1000 }] }, NOW),
    ).toBeNull();
  });

  test("rejects stale, future, missing, and malformed authentication evidence", () => {
    expect(
      recentStrongAuthAt({ amr: [{ method: "oauth", timestamp: NOW / 1000 - 601 }] }, NOW),
    ).toBeNull();
    expect(
      recentStrongAuthAt({ amr: [{ method: "totp", timestamp: NOW / 1000 + 61 }] }, NOW),
    ).toBeNull();
    expect(recentStrongAuthAt({}, NOW)).toBeNull();
    expect(recentStrongAuthAt({ amr: [{ method: "password", timestamp: "now" }] }, NOW)).toBeNull();
  });
});
