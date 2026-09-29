import { describe, expect, test } from "bun:test";

import { sandboxVector } from "./sandbox.server";
import { verifyAgentCredential, peekCredential } from "./credential";
import { canonicalProofString, verifyProof } from "./pop";
import { b64uDecode, b64uEncode } from "./jws";

const ORIGIN = "https://infinity.id";

/**
 * These tests are the vector's contract. If they fail, every developer following
 * our integration guide gets a broken example, which is worse than none.
 */
describe("the published test vector", () => {
  test("is deterministic, so it can be committed to someone else's test suite", async () => {
    const a = await sandboxVector(ORIGIN);
    const b = await sandboxVector(ORIGIN);
    expect(a.credential).toBe(b.credential);
    expect(a.proof.signature).toBe(b.proof.signature);
    expect(a.jwks.keys[0]!.kid).toBe(b.jwks.keys[0]!.kid);
  });

  test("its credential verifies, which is step 1 of the guide", async () => {
    const v = await sandboxVector(ORIGIN);
    const result = await verifyAgentCredential(v.credential, v.jwks, { expectedIssuer: v.issuer });
    expect(result.valid).toBe(true);
  });

  test("its canonical string matches what a verifier rebuilds, which is step 2", async () => {
    const v = await sandboxVector(ORIGIN);
    const rebuilt = canonicalProofString({
      nonce: v.proof.nonce,
      method: v.proof.method,
      url: v.proof.url,
      bodySha256: v.proof.bodySha256,
    });
    expect(rebuilt).toBe(v.proof.canonical_string);
  });

  test("its proof verifies against the key inside the credential, which is step 3", async () => {
    const v = await sandboxVector(ORIGIN);
    const cred = await verifyAgentCredential(v.credential, v.jwks, { expectedIssuer: v.issuer });
    expect(cred.valid).toBe(true);
    if (!cred.valid) return;
    const proof = await verifyProof(cred.subject.publicKey, v.proof.signature, {
      nonce: v.proof.nonce,
      method: v.proof.method,
      url: v.proof.url,
      bodySha256: v.proof.bodySha256,
    });
    expect(proof).toEqual({ ok: true });
  });

  test("tampering with the credential makes it fail, which is step 4", async () => {
    const v = await sandboxVector(ORIGIN);
    const [h, p, s] = v.credential.split(".") as [string, string, string];
    const payload = JSON.parse(new TextDecoder().decode(b64uDecode(p)));
    payload.vc.credentialSubject.mandate.monthlySpendLimitUsd = 99_999;
    const forged = `${h}.${b64uEncode(new TextEncoder().encode(JSON.stringify(payload)))}.${s}`;
    const result = await verifyAgentCredential(forged, v.jwks, { expectedIssuer: v.issuer });
    expect(result.valid).toBe(false);
  });

  test("changing the nonce makes the proof fail, which is step 5", async () => {
    const v = await sandboxVector(ORIGIN);
    const cred = await verifyAgentCredential(v.credential, v.jwks, { expectedIssuer: v.issuer });
    if (!cred.valid) throw new Error("vector credential should verify");
    const proof = await verifyProof(cred.subject.publicKey, v.proof.signature, {
      nonce: "a-different-nonce",
      method: v.proof.method,
      url: v.proof.url,
      bodySha256: v.proof.bodySha256,
    });
    expect(proof).toEqual({ ok: false, reason: "bad_proof_signature" });
  });

  test("every documented step is present in how_to_use", async () => {
    const v = await sandboxVector(ORIGIN);
    expect(v.how_to_use).toHaveLength(5);
  });
});

describe("the sandbox cannot be mistaken for production", () => {
  test("its issuer is not the production origin", async () => {
    const v = await sandboxVector(ORIGIN);
    expect(v.issuer).toBe(`${ORIGIN}/sandbox`);
    expect(v.issuer).not.toBe(ORIGIN);
  });

  test("a sandbox credential fails a production issuer check", async () => {
    // The single most important property. A verifier pinning the real issuer must
    // reject these outright, or the sandbox becomes a forgery kit.
    const v = await sandboxVector(ORIGIN);
    const result = await verifyAgentCredential(v.credential, v.jwks, { expectedIssuer: ORIGIN });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("issuer_mismatch");
  });

  test("it carries a warning saying it proves nothing", async () => {
    const v = await sandboxVector(ORIGIN);
    expect(v.warning).toMatch(/SANDBOX ONLY/);
    expect(v.warning).toMatch(/anyone can forge/i);
  });

  test("its owner is reported as unverified, not quietly verified", async () => {
    const v = await sandboxVector(ORIGIN);
    const payload = peekCredential(v.credential);
    expect(payload?.vc.credentialSubject.owner.identityVerified).toBe(false);
    expect(payload?.vc.credentialSubject.owner.attestation.assurance).toBe("none");
  });

  test("its mandate is small, so a copy-pasted sandbox agent cannot authorise much", async () => {
    const payload = peekCredential((await sandboxVector(ORIGIN)).credential);
    expect(payload!.vc.credentialSubject.mandate.monthlySpendLimitUsd).toBeLessThanOrEqual(100);
  });
});
