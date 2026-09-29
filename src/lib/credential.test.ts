import { describe, expect, test } from "bun:test";

import {
  buildCredentialPayload,
  verifyAgentCredential,
  peekCredential,
  CREDENTIAL_TYP,
  type CredentialSource,
} from "./credential";
import {
  generateIssuerKeypair,
  signCompactJws,
  jwkThumbprint,
  toPublicJwk,
  parseStoredPublicKey,
  verifyRawEd25519,
  b64uDecode,
  b64uEncode,
  type Jwks,
} from "./jws";
import { generateAgentKeys } from "./keys";

const ORIGIN = "https://infinity.id";

const AGENT: CredentialSource = {
  public_id: "inf_TEST-0001-AAAA",
  name: "Atlas",
  source: "Claude Code",
  public_key: "ed25519:AAAA",
  owner_name: "Rohit S.",
  owner_verified: true,
  permissions: ["Send email", "Book appointments"],
  monthly_spend_limit: 200,
  approval_above: 50,
  created_at: "2026-09-01T00:00:00.000Z",
  expires_at: "2027-03-01T00:00:00.000Z",
};

const INSIDE_WINDOW = new Date("2026-10-01T00:00:00.000Z");

async function issuer() {
  const { privateJwk, publicJwk } = await generateIssuerKeypair();
  return { privateJwk, jwks: { keys: [publicJwk] } satisfies Jwks };
}

async function mint(agent: CredentialSource = AGENT) {
  const { privateJwk, jwks } = await issuer();
  const payload = buildCredentialPayload(agent, ORIGIN);
  const jws = await signCompactJws(payload, privateJwk, CREDENTIAL_TYP);
  return { jws, jwks, privateJwk };
}

describe("base64url", () => {
  test("round-trips arbitrary bytes including padding edges", () => {
    for (const len of [0, 1, 2, 3, 31, 32, 64]) {
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = (i * 7 + 3) % 256;
      expect([...b64uDecode(b64uEncode(bytes))]).toEqual([...bytes]);
    }
  });

  test("emits no padding or url-unsafe characters", () => {
    const bytes = new Uint8Array([251, 255, 254, 250, 1, 2]);
    const out = b64uEncode(bytes);
    expect(out).not.toContain("=");
    expect(out).not.toContain("+");
    expect(out).not.toContain("/");
  });
});

describe("issuer keys", () => {
  test("kid is the RFC 7638 thumbprint, so it is derived not assigned", async () => {
    const { privateJwk } = await issuer();
    expect(privateJwk.kid).toBe(await jwkThumbprint(privateJwk));
  });

  test("toPublicJwk never leaks the private component", async () => {
    const { privateJwk } = await issuer();
    const pub = toPublicJwk(privateJwk) as Record<string, unknown>;
    expect(pub["d"]).toBeUndefined();
    expect(JSON.stringify(pub)).not.toContain(privateJwk.d);
  });

  test("two generated keypairs differ", async () => {
    const a = await generateIssuerKeypair();
    const b = await generateIssuerKeypair();
    expect(a.privateJwk.x).not.toBe(b.privateJwk.x);
  });
});

describe("credential payload", () => {
  test("is deterministic for identical agent state", () => {
    const a = buildCredentialPayload(AGENT, ORIGIN);
    const b = buildCredentialPayload(AGENT, ORIGIN);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("carries the mandate and the owner accountability flag", () => {
    const p = buildCredentialPayload(AGENT, ORIGIN);
    expect(p.vc.credentialSubject.mandate.monthlySpendLimitUsd).toBe(200);
    expect(p.vc.credentialSubject.mandate.approvalAboveUsd).toBe(50);
    expect(p.vc.credentialSubject.owner.identityVerified).toBe(true);
    expect(p.vc.credentialSubject.mandate.permissions).toEqual(["Send email", "Book appointments"]);
  });

  test("points at a live status endpoint, since signatures cannot express revocation", () => {
    const p = buildCredentialPayload(AGENT, ORIGIN);
    expect(p.vc.credentialStatus.id).toBe(`${ORIGIN}/api/public/status/${AGENT.public_id}`);
  });

  test("validity window matches the agent's issued and expiry dates", () => {
    const p = buildCredentialPayload(AGENT, ORIGIN);
    expect(p.iat).toBe(Math.floor(Date.parse(AGENT.created_at) / 1000));
    expect(p.exp).toBe(Math.floor(Date.parse(AGENT.expires_at) / 1000));
  });
});

describe("verification — the happy path", () => {
  test("a freshly issued credential verifies offline against the JWKS", async () => {
    const { jws, jwks } = await mint();
    const result = await verifyAgentCredential(jws, jwks, {
      now: INSIDE_WINDOW,
      expectedIssuer: ORIGIN,
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.subject.id).toBe(AGENT.public_id);
    expect(result.subject.owner.name).toBe("Rohit S.");
    expect(result.statusUrl).toContain("/api/public/status/");
  });

  test("header declares EdDSA and the vc+jwt type", async () => {
    const { jws, jwks } = await mint();
    const result = await verifyAgentCredential(jws, jwks, { now: INSIDE_WINDOW });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.header.alg).toBe("EdDSA");
    expect(result.header.typ).toBe(CREDENTIAL_TYP);
  });
});

describe("verification — forgery and tampering must fail", () => {
  test("a credential signed by a different key is rejected", async () => {
    const { jws } = await mint();
    const other = await issuer();
    const result = await verifyAgentCredential(jws, other.jwks, { now: INSIDE_WINDOW });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    // different issuer key means a different thumbprint, so the kid will not resolve
    expect(["unknown_kid", "bad_signature"]).toContain(result.reason);
  });

  test("raising the spend limit in the payload breaks the signature", async () => {
    const { jws, jwks } = await mint();
    const [h, p, s] = jws.split(".");
    const payload = JSON.parse(new TextDecoder().decode(b64uDecode(p!)));
    payload.vc.credentialSubject.mandate.monthlySpendLimitUsd = 1_000_000;
    const forged = `${h}.${b64uEncode(new TextEncoder().encode(JSON.stringify(payload)))}.${s}`;
    const result = await verifyAgentCredential(forged, jwks, { now: INSIDE_WINDOW });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("bad_signature");
  });

  test("flipping owner identityVerified breaks the signature", async () => {
    const { jws, jwks } = await mint();
    const [h, p, s] = jws.split(".");
    const payload = JSON.parse(new TextDecoder().decode(b64uDecode(p!)));
    payload.vc.credentialSubject.owner.identityVerified = true;
    payload.vc.credentialSubject.owner.name = "Someone Else";
    const forged = `${h}.${b64uEncode(new TextEncoder().encode(JSON.stringify(payload)))}.${s}`;
    const result = await verifyAgentCredential(forged, jwks, { now: INSIDE_WINDOW });
    expect(result.valid).toBe(false);
  });

  test("an unsigned 'alg: none' credential is rejected", async () => {
    const { jwks } = await mint();
    const header = b64uEncode(
      new TextEncoder().encode(JSON.stringify({ alg: "none", typ: CREDENTIAL_TYP, kid: "x" })),
    );
    const payload = b64uEncode(
      new TextEncoder().encode(JSON.stringify(buildCredentialPayload(AGENT, ORIGIN))),
    );
    const result = await verifyAgentCredential(`${header}.${payload}.`, jwks, {
      now: INSIDE_WINDOW,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("unsupported_alg");
  });

  test("malformed input is rejected rather than throwing", async () => {
    const { jwks } = await mint();
    for (const bad of ["", "nonsense", "a.b", "a.b.c.d"]) {
      const result = await verifyAgentCredential(bad, jwks, { now: INSIDE_WINDOW });
      expect(result.valid).toBe(false);
    }
  });

  test("an empty key set cannot validate anything", async () => {
    const { jws } = await mint();
    const result = await verifyAgentCredential(jws, { keys: [] }, { now: INSIDE_WINDOW });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("unknown_kid");
  });
});

describe("verification — claim checks", () => {
  test("an expired credential is rejected", async () => {
    const { jws, jwks } = await mint();
    const result = await verifyAgentCredential(jws, jwks, {
      now: new Date("2028-01-01T00:00:00Z"),
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("expired");
  });

  test("a credential presented before its start date is rejected", async () => {
    const { jws, jwks } = await mint();
    const result = await verifyAgentCredential(jws, jwks, {
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("not_yet_valid");
  });

  test("a mismatched expected issuer is rejected even with a good signature", async () => {
    const { jws, jwks } = await mint();
    const result = await verifyAgentCredential(jws, jwks, {
      now: INSIDE_WINDOW,
      expectedIssuer: "https://impostor.example",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("issuer_mismatch");
  });

  test("a validly signed credential of the wrong type is rejected", async () => {
    const { privateJwk, jwks } = await issuer();
    const payload = buildCredentialPayload(AGENT, ORIGIN);
    (payload.vc as unknown as { type: string[] }).type = ["VerifiableCredential", "SomethingElse"];
    const jws = await signCompactJws(payload, privateJwk, CREDENTIAL_TYP);
    const result = await verifyAgentCredential(jws, jwks, { now: INSIDE_WINDOW });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("wrong_type");
  });
});

describe("peekCredential", () => {
  test("reads claims without verifying, for displaying a failure", async () => {
    const { jws } = await mint();
    expect(peekCredential(jws)?.sub).toBe(AGENT.public_id);
  });

  test("returns null on garbage", () => {
    expect(peekCredential("not-a-jws")).toBeNull();
  });
});

describe("agent-held keys", () => {
  test("the stored ed25519: public key parses to 32 raw bytes", async () => {
    const { publicKey } = await generateAgentKeys();
    const raw = parseStoredPublicKey(publicKey);
    expect(raw).not.toBeNull();
    expect(raw!.length).toBe(32);
  });

  test("a signature by the agent verifies against its stored public key", async () => {
    // Mirrors what the agent does with the secret it was given at issuance.
    const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    const stored = `ed25519:${btoa(String.fromCharCode(...rawPub))}`;

    const message = new TextEncoder().encode("book:flight:LHR-BLR:2026-11-02");
    const sig = new Uint8Array(
      await crypto.subtle.sign({ name: "Ed25519" }, pair.privateKey, message),
    );

    expect(await verifyRawEd25519(message, sig, parseStoredPublicKey(stored)!)).toBe(true);
  });

  test("a signature over different bytes does not verify", async () => {
    const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    const sig = new Uint8Array(
      await crypto.subtle.sign(
        { name: "Ed25519" },
        pair.privateKey,
        new TextEncoder().encode("spend:50"),
      ),
    );
    const tampered = new TextEncoder().encode("spend:5000");
    expect(await verifyRawEd25519(tampered, sig, rawPub)).toBe(false);
  });

  test("another agent's key cannot vouch for this agent's signature", async () => {
    const mine = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    const theirs = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    const msg = new TextEncoder().encode("act");
    const sig = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, mine.privateKey, msg));
    const theirPub = new Uint8Array(await crypto.subtle.exportKey("raw", theirs.publicKey));
    expect(await verifyRawEd25519(msg, sig, theirPub)).toBe(false);
  });

  test("parseStoredPublicKey rejects a malformed key", () => {
    expect(parseStoredPublicKey("ed25519:!!!not-base64!!!")).toBeNull();
    expect(parseStoredPublicKey("ed25519:AAAA")).toBeNull(); // wrong length
  });
});
