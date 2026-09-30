import { describe, expect, test } from "bun:test";

import { buildCredentialPayload, CREDENTIAL_TYP, type CredentialSource } from "./credential";
import { generateIssuerKeypair, signCompactJws, toPublicJwk } from "./jws";
import { canonicalProofString, createChallenge, signProof, verifyProof, POP_VERSION } from "./pop";
import { createVerifier } from "./verifier";

const ISSUER = "https://infinity.id";

/** A complete agent: issuer keypair, agent keypair, and a signed credential. */
async function scenario(overrides: Partial<CredentialSource> = {}) {
  const issuerKeys = await generateIssuerKeypair();
  const agentKeys = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", agentKeys.publicKey));
  const storedPub = `ed25519:${btoa(String.fromCharCode(...rawPub))}`;

  const agent: CredentialSource = {
    public_id: "inf_VERI-0001-CCCC",
    name: "Atlas",
    source: "Claude Code",
    public_key: storedPub,
    owner_name: "Rohit S.",
    owner_verified: true,
    permissions: ["Send email", "Book appointments"],
    monthly_spend_limit: 200,
    approval_above: 50,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    ...overrides,
  };

  const credential = await signCompactJws(
    buildCredentialPayload(agent, ISSUER),
    issuerKeys.privateJwk,
    CREDENTIAL_TYP,
  );

  return {
    agent,
    credential,
    storedPub,
    agentKeys,
    jwks: { keys: [toPublicJwk(issuerKeys.privateJwk)] },
  };
}

/** Stand-in for Infinity's public endpoints, so tests never touch the network. */
function fakeFetch(
  jwks: unknown,
  status: { status: string; usable: boolean; credential_status?: string },
) {
  const calls = { jwks: 0, status: 0 };
  const impl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("jwks.json")) {
      calls.jwks++;
      return new Response(JSON.stringify(jwks), { status: 200 });
    }
    if (url.includes("/api/public/status/")) {
      calls.status++;
      return new Response(JSON.stringify(status), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const REQ = { method: "POST", url: "https://shop.example/checkout", body: '{"sku":"abc"}' };

describe("canonical proof string", () => {
  test("is version-tagged and newline-separated", () => {
    const s = canonicalProofString({ nonce: "n", method: "post", url: "u", bodySha256: "h" });
    expect(s.split("\n")).toEqual([POP_VERSION, "n", "POST", "u", "h"]);
  });

  test("uppercases the method so casing cannot break a match", () => {
    const a = canonicalProofString({ nonce: "n", method: "post", url: "u", bodySha256: "" });
    const b = canonicalProofString({ nonce: "n", method: "POST", url: "u", bodySha256: "" });
    expect(a).toBe(b);
  });

  test("rejects newlines in a field, so no field can absorb another", () => {
    expect(() =>
      canonicalProofString({ nonce: "a\nb", method: "GET", url: "u", bodySha256: "" }),
    ).toThrow(/must not contain a newline/);
  });

  test("challenges are unique and long enough to not collide", () => {
    const seen = new Set(Array.from({ length: 200 }, () => createChallenge()));
    expect(seen.size).toBe(200);
    expect(createChallenge().length).toBeGreaterThanOrEqual(40);
  });
});

describe("proof of possession in isolation", () => {
  test("a signature by the agent's key verifies", async () => {
    const { storedPub, agentKeys } = await scenario();
    const parts = {
      nonce: createChallenge(),
      method: "GET",
      url: "https://x.test/a",
      bodySha256: "",
    };
    const sig = await signProof(agentKeys.privateKey, parts);
    expect(await verifyProof(storedPub, sig, parts)).toEqual({ ok: true });
  });

  test("a signature cannot be moved to a different nonce", async () => {
    const { storedPub, agentKeys } = await scenario();
    const parts = {
      nonce: createChallenge(),
      method: "GET",
      url: "https://x.test/a",
      bodySha256: "",
    };
    const sig = await signProof(agentKeys.privateKey, parts);
    const moved = { ...parts, nonce: createChallenge() };
    expect(await verifyProof(storedPub, sig, moved)).toEqual({
      ok: false,
      reason: "bad_proof_signature",
    });
  });

  test("a changed body does not verify", async () => {
    const { storedPub, agentKeys } = await scenario();
    const parts = {
      nonce: createChallenge(),
      method: "POST",
      url: "https://x.test/a",
      bodySha256: "aaaa",
    };
    const sig = await signProof(agentKeys.privateKey, parts);
    expect(await verifyProof(storedPub, sig, { ...parts, bodySha256: "bbbb" })).toEqual({
      ok: false,
      reason: "bad_proof_signature",
    });
  });

  test("another agent's key cannot produce a valid proof", async () => {
    const a = await scenario();
    const b = await scenario();
    const parts = {
      nonce: createChallenge(),
      method: "GET",
      url: "https://x.test/a",
      bodySha256: "",
    };
    const sig = await signProof(b.agentKeys.privateKey, parts);
    expect(await verifyProof(a.storedPub, sig, parts)).toEqual({
      ok: false,
      reason: "bad_proof_signature",
    });
  });

  test("malformed inputs are reported, not thrown", async () => {
    const { storedPub } = await scenario();
    const parts = { nonce: "n", method: "GET", url: "u", bodySha256: "" };
    expect((await verifyProof("ed25519:!!!", "AAAA", parts)).ok).toBe(false);
    expect(await verifyProof(storedPub, "tooshort", parts)).toEqual({
      ok: false,
      reason: "malformed_signature",
    });
  });
});

describe("the full handshake a business runs", () => {
  test("the same valid proof is rejected when replayed", async () => {
    const s = await scenario();
    const { impl, calls } = fakeFetch(s.jwks, { status: "valid", usable: true });
    const verifier = createVerifier({ issuer: ISSUER, fetchImpl: impl });
    const nonce = verifier.challenge();
    const signature = await signProof(s.agentKeys.privateKey, {
      nonce,
      method: REQ.method,
      url: REQ.url,
      bodySha256: await import("./jws").then((m) => m.sha256Hex(REQ.body)),
    });
    const input = { credential: s.credential, signature, nonce, ...REQ };

    expect((await verifier.verify(input)).trusted).toBe(true);
    const replay = await verifier.verify(input);
    expect(replay).toEqual({
      trusted: false,
      reason: "proof_invalid",
      detail: "challenge_not_issued_or_replayed",
    });
    expect(calls.status).toBe(1);
  });

  test("a genuine agent is trusted", async () => {
    const s = await scenario();
    const { impl } = fakeFetch(s.jwks, { status: "valid", usable: true });
    const verifier = createVerifier({ issuer: ISSUER, fetchImpl: impl });

    const nonce = verifier.challenge();
    const signature = await signProof(s.agentKeys.privateKey, {
      nonce,
      method: REQ.method,
      url: REQ.url,
      bodySha256: await import("./jws").then((m) => m.sha256Hex(REQ.body)),
    });

    const result = await verifier.verify({ credential: s.credential, signature, nonce, ...REQ });
    expect(result.trusted).toBe(true);
    if (!result.trusted) return;
    expect(result.agent.id).toBe(s.agent.public_id);
    expect(result.agent.owner.name).toBe("Rohit S.");
  });

  test("a stolen credential without the key is rejected — the bearer-token fix", async () => {
    const victim = await scenario();
    const thief = await scenario();
    const { impl } = fakeFetch(victim.jwks, { status: "valid", usable: true });
    const verifier = createVerifier({ issuer: ISSUER, fetchImpl: impl });

    const nonce = verifier.challenge();
    // The thief replays the victim's credential but can only sign with its own key.
    const signature = await signProof(thief.agentKeys.privateKey, {
      nonce,
      method: REQ.method,
      url: REQ.url,
      bodySha256: await import("./jws").then((m) => m.sha256Hex(REQ.body)),
    });

    const result = await verifier.verify({
      credential: victim.credential,
      signature,
      nonce,
      ...REQ,
    });
    expect(result.trusted).toBe(false);
    if (result.trusted) return;
    expect(result.reason).toBe("proof_invalid");
  });

  test("a frozen agent is refused even with a perfect credential and proof", async () => {
    const s = await scenario();
    const { impl } = fakeFetch(s.jwks, { status: "frozen", usable: false });
    const verifier = createVerifier({ issuer: ISSUER, fetchImpl: impl });

    const nonce = verifier.challenge();
    const signature = await signProof(s.agentKeys.privateKey, {
      nonce,
      method: REQ.method,
      url: REQ.url,
      bodySha256: await import("./jws").then((m) => m.sha256Hex(REQ.body)),
    });

    const result = await verifier.verify({ credential: s.credential, signature, nonce, ...REQ });
    expect(result.trusted).toBe(false);
    if (result.trusted) return;
    expect(result.reason).toBe("not_live");
    expect(result.detail).toBe("frozen");
  });

  test("a superseded credential reports the credential-level reason", async () => {
    const s = await scenario();
    const { impl } = fakeFetch(s.jwks, {
      status: "valid",
      usable: false,
      credential_status: "superseded",
    });
    const verifier = createVerifier({ issuer: ISSUER, fetchImpl: impl });
    const nonce = verifier.challenge();
    const signature = await signProof(s.agentKeys.privateKey, {
      nonce,
      method: REQ.method,
      url: REQ.url,
      bodySha256: await import("./jws").then((m) => m.sha256Hex(REQ.body)),
    });

    const result = await verifier.verify({ credential: s.credential, signature, nonce, ...REQ });
    expect(result).toEqual({ trusted: false, reason: "not_live", detail: "superseded" });
  });

  test("a credential from another issuer is rejected", async () => {
    const s = await scenario();
    const other = await scenario();
    // Serve a key set that does not contain the key which signed s.credential.
    const { impl } = fakeFetch(other.jwks, { status: "valid", usable: true });
    const verifier = createVerifier({ issuer: ISSUER, fetchImpl: impl });
    const nonce = verifier.challenge();
    const result = await verifier.verify({
      credential: s.credential,
      signature: "x",
      nonce,
      ...REQ,
    });
    expect(result.trusted).toBe(false);
    if (!result.trusted) expect(result.reason).toBe("credential_invalid");
  });

  test("an expired credential is rejected before any network call for status", async () => {
    const s = await scenario({
      created_at: new Date(Date.now() - 200_000_000).toISOString(),
      expires_at: new Date(Date.now() - 100_000_000).toISOString(),
    });
    const { impl, calls } = fakeFetch(s.jwks, { status: "valid", usable: true });
    const verifier = createVerifier({ issuer: ISSUER, fetchImpl: impl });
    const nonce = verifier.challenge();
    const result = await verifier.verify({
      credential: s.credential,
      signature: "x",
      nonce,
      ...REQ,
    });
    expect(result.trusted).toBe(false);
    if (!result.trusted) expect(result.detail).toBe("expired");
    expect(calls.status).toBe(0);
  });

  test("the key set is fetched once and cached across verifications", async () => {
    const s = await scenario();
    const { impl, calls } = fakeFetch(s.jwks, { status: "valid", usable: true });
    const verifier = createVerifier({ issuer: ISSUER, fetchImpl: impl });
    for (let i = 0; i < 3; i++) {
      const nonce = verifier.challenge();
      const signature = await signProof(s.agentKeys.privateKey, {
        nonce,
        method: REQ.method,
        url: REQ.url,
        bodySha256: await import("./jws").then((m) => m.sha256Hex(REQ.body)),
      });
      await verifier.verify({ credential: s.credential, signature, nonce, ...REQ });
    }
    expect(calls.jwks).toBe(1);
    // Status is not cached by default, so it is checked every time.
    expect(calls.status).toBe(3);
  });

  test("status may be cached explicitly, which removes us from the hot path", async () => {
    const s = await scenario();
    const { impl, calls } = fakeFetch(s.jwks, { status: "valid", usable: true });
    const verifier = createVerifier({ issuer: ISSUER, fetchImpl: impl, statusTtlMs: 5_000 });
    for (let i = 0; i < 3; i++) {
      const nonce = verifier.challenge();
      const signature = await signProof(s.agentKeys.privateKey, {
        nonce,
        method: REQ.method,
        url: REQ.url,
        bodySha256: await import("./jws").then((m) => m.sha256Hex(REQ.body)),
      });
      await verifier.verify({ credential: s.credential, signature, nonce, ...REQ });
    }
    expect(calls.status).toBe(1);
  });
});

describe("mandate checks, which are authorization not verification", () => {
  test("an action inside the mandate is allowed with no human", async () => {
    const s = await scenario();
    const v = createVerifier({ issuer: ISSUER });
    const subject = {
      id: s.agent.public_id,
      name: s.agent.name,
      source: s.agent.source,
      publicKey: s.storedPub,
      owner: { name: "Rohit S.", identityVerified: true },
      mandate: { permissions: ["Send email"], monthlySpendLimitUsd: 200, approvalAboveUsd: 50 },
    };
    expect(v.withinMandate(subject, { permission: "Send email", amountUsd: 20 })).toEqual({
      allowed: true,
    });
  });

  test("an amount above the approval threshold needs the owner", async () => {
    const v = createVerifier({ issuer: ISSUER });
    const subject = {
      id: "inf_x",
      name: "a",
      source: "b",
      publicKey: "ed25519:AAAA",
      owner: { name: "o", identityVerified: true },
      mandate: { permissions: ["Make purchases"], monthlySpendLimitUsd: 200, approvalAboveUsd: 50 },
    };
    expect(v.withinMandate(subject, { permission: "Make purchases", amountUsd: 120 })).toEqual({
      allowed: false,
      reason: "owner_approval_required",
    });
  });

  test("an amount over the ceiling is refused outright, not escalated", async () => {
    const v = createVerifier({ issuer: ISSUER });
    const subject = {
      id: "inf_x",
      name: "a",
      source: "b",
      publicKey: "ed25519:AAAA",
      owner: { name: "o", identityVerified: true },
      mandate: { permissions: ["Make purchases"], monthlySpendLimitUsd: 200, approvalAboveUsd: 50 },
    };
    expect(v.withinMandate(subject, { permission: "Make purchases", amountUsd: 5000 })).toEqual({
      allowed: false,
      reason: "over_spend_limit",
    });
  });

  test("a permission the owner never granted is refused", async () => {
    const v = createVerifier({ issuer: ISSUER });
    const subject = {
      id: "inf_x",
      name: "a",
      source: "b",
      publicKey: "ed25519:AAAA",
      owner: { name: "o", identityVerified: true },
      mandate: { permissions: ["Send email"], monthlySpendLimitUsd: 200, approvalAboveUsd: 50 },
    };
    expect(v.withinMandate(subject, { permission: "Make calls" })).toEqual({
      allowed: false,
      reason: "permission_not_granted",
    });
  });
});
