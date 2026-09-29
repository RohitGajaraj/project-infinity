import { afterEach, describe, expect, test } from "bun:test";

import {
  ISSUER_ENV_VAR,
  ISSUER_SEED_ENV_VAR,
  isProvisional,
  issueAgentCredential,
  issuerMetadata,
  issuerMode,
  issuerOrigin,
  publicJwks,
} from "./issuer.server";
import { deriveKeypairFromSeed, generateIssuerKeypair } from "./jws";
import { verifyAgentCredential, type CredentialSource } from "./credential";

const ORIGIN = "https://infinity.id";
const SERVICE_KEY_VAR = "SUPABASE_SERVICE_ROLE_KEY";

const AGENT: CredentialSource = {
  public_id: "inf_ISSU-0001-BBBB",
  name: "Atlas",
  source: "Claude Code",
  public_key: "ed25519:AAAA",
  owner_name: "Rohit S.",
  owner_verified: false,
  permissions: ["Send email"],
  monthly_spend_limit: 200,
  approval_above: 50,
  created_at: "2026-09-01T00:00:00.000Z",
  expires_at: "2027-03-01T00:00:00.000Z",
};
const NOW = new Date("2026-10-01T00:00:00.000Z");

function clearEnv() {
  delete process.env[ISSUER_ENV_VAR];
  delete process.env[ISSUER_SEED_ENV_VAR];
  delete process.env[SERVICE_KEY_VAR];
  delete process.env["INFINITY_ISSUER_ORIGIN"];
}

afterEach(clearEnv);

describe("key resolution precedence", () => {
  test("an explicit JWK wins over everything", async () => {
    clearEnv();
    const { privateJwk } = await generateIssuerKeypair();
    process.env[ISSUER_ENV_VAR] = JSON.stringify(privateJwk);
    process.env[ISSUER_SEED_ENV_VAR] = "some-seed";
    process.env[SERVICE_KEY_VAR] = "some-service-key";

    expect(await issuerMode()).toBe("explicit");
    expect((await publicJwks()).keys[0]!.kid).toBe(privateJwk.kid!);
  });

  test("a dedicated seed is used when no explicit JWK is set", async () => {
    clearEnv();
    process.env[ISSUER_SEED_ENV_VAR] = "a-dedicated-issuing-secret";
    process.env[SERVICE_KEY_VAR] = "some-service-key";
    expect(await issuerMode()).toBe("seed");
  });

  test("falls back to a provisional key derived from backend credentials", async () => {
    clearEnv();
    process.env[SERVICE_KEY_VAR] = "service-role-key-value";
    expect(await issuerMode()).toBe("provisional");
  });

  test("with nothing configured it is insecure, never absent", async () => {
    clearEnv();
    expect(await issuerMode()).toBe("insecure");
    expect((await publicJwks()).keys).toHaveLength(1);
  });

  test("rejects a malformed explicit JWK loudly rather than falling back", async () => {
    clearEnv();
    process.env[ISSUER_ENV_VAR] = "not json";
    await expect(publicJwks()).rejects.toThrow(/valid JSON/);
    process.env[ISSUER_ENV_VAR] = JSON.stringify({ kty: "RSA" });
    await expect(publicJwks()).rejects.toThrow(/must be an Ed25519 private JWK/);
  });

  test("picks up a rotated secret without a restart", async () => {
    clearEnv();
    process.env[ISSUER_SEED_ENV_VAR] = "first-secret";
    const first = (await publicJwks()).keys[0]!.kid;
    process.env[ISSUER_SEED_ENV_VAR] = "second-secret";
    const second = (await publicJwks()).keys[0]!.kid;
    expect(second).not.toBe(first);
  });
});

describe("provisional labelling", () => {
  test("only explicit and seed modes are treated as production-grade", () => {
    expect(isProvisional("explicit")).toBe(false);
    expect(isProvisional("seed")).toBe(false);
    expect(isProvisional("provisional")).toBe(true);
    expect(isProvisional("insecure")).toBe(true);
  });

  test("metadata reports the mode honestly so a dev key cannot look real", async () => {
    clearEnv();
    const meta = await issuerMetadata(ORIGIN);
    expect(meta.key_mode).toBe("insecure");
    expect(meta.provisional).toBe(true);
    expect(meta.key_mode_note).toMatch(/forge/i);
  });

  test("an explicit key is reported as not provisional", async () => {
    clearEnv();
    const { privateJwk } = await generateIssuerKeypair();
    process.env[ISSUER_ENV_VAR] = JSON.stringify(privateJwk);
    const meta = await issuerMetadata(ORIGIN);
    expect(meta.provisional).toBe(false);
    expect(meta.jwks_uri).toBe(`${ORIGIN}/.well-known/jwks.json`);
    expect(meta.signing_alg_values_supported).toEqual(["EdDSA"]);
  });
});

describe("deterministic derivation", () => {
  test("the same seed always yields the same key, which multi-instance edge requires", async () => {
    const a = await deriveKeypairFromSeed("stable-seed", "issuer");
    const b = await deriveKeypairFromSeed("stable-seed", "issuer");
    expect(a.privateJwk.x).toBe(b.privateJwk.x);
    expect(a.privateJwk.d).toBe(b.privateJwk.d);
  });

  test("the info label domain-separates, so one secret cannot serve two purposes", async () => {
    const a = await deriveKeypairFromSeed("same-seed", "issuer");
    const b = await deriveKeypairFromSeed("same-seed", "issuer/provisional");
    expect(a.privateJwk.x).not.toBe(b.privateJwk.x);
  });

  test("different seeds yield different keys", async () => {
    const a = await deriveKeypairFromSeed("seed-one", "issuer");
    const b = await deriveKeypairFromSeed("seed-two", "issuer");
    expect(a.privateJwk.x).not.toBe(b.privateJwk.x);
  });

  test("a derived key actually signs and verifies", async () => {
    clearEnv();
    process.env[ISSUER_SEED_ENV_VAR] = "signing-seed";
    const jws = await issueAgentCredential(AGENT, ORIGIN);
    const result = await verifyAgentCredential(jws, await publicJwks(), {
      now: NOW,
      expectedIssuer: ORIGIN,
    });
    expect(result.valid).toBe(true);
  });

  test("an empty seed is refused", async () => {
    await expect(deriveKeypairFromSeed("", "issuer")).rejects.toThrow(/must not be empty/);
  });
});

describe("published key set", () => {
  test("never contains private material", async () => {
    clearEnv();
    process.env[ISSUER_SEED_ENV_VAR] = "leak-check-seed";
    const { privateJwk } = await deriveKeypairFromSeed("leak-check-seed", "issuer");
    const serialised = JSON.stringify(await publicJwks());
    expect(serialised).not.toContain(privateJwk.d);
    expect(serialised).toContain(privateJwk.x);
  });
});

describe("end-to-end issue then verify", () => {
  test("a credential issued by the server verifies against the served JWKS", async () => {
    clearEnv();
    const { privateJwk } = await generateIssuerKeypair();
    process.env[ISSUER_ENV_VAR] = JSON.stringify(privateJwk);

    const jws = await issueAgentCredential(AGENT, ORIGIN);
    const result = await verifyAgentCredential(jws, await publicJwks(), {
      now: NOW,
      expectedIssuer: ORIGIN,
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.subject.id).toBe(AGENT.public_id);
    // An unverified owner must be reported honestly inside the signed payload.
    expect(result.subject.owner.identityVerified).toBe(false);
  });

  test("a credential from the previous key fails against a rotated key set", async () => {
    clearEnv();
    process.env[ISSUER_SEED_ENV_VAR] = "before-rotation";
    const jws = await issueAgentCredential(AGENT, ORIGIN);
    process.env[ISSUER_SEED_ENV_VAR] = "after-rotation";
    const result = await verifyAgentCredential(jws, await publicJwks(), { now: NOW });
    expect(result.valid).toBe(false);
  });

  test("a provisional credential is still cryptographically valid — only its standing differs", async () => {
    clearEnv();
    process.env[SERVICE_KEY_VAR] = "service-role-key-value";
    const jws = await issueAgentCredential(AGENT, ORIGIN);
    const result = await verifyAgentCredential(jws, await publicJwks(), { now: NOW });
    expect(result.valid).toBe(true);
    expect(isProvisional(await issuerMode())).toBe(true);
  });
});

describe("issuer identity", () => {
  test("defaults to the request origin", () => {
    expect(issuerOrigin("https://staging.example/api/x")).toBe("https://staging.example");
  });

  test("an explicit origin wins, so staging cannot claim to be production", () => {
    process.env["INFINITY_ISSUER_ORIGIN"] = "https://infinity.id/";
    expect(issuerOrigin("https://staging.example/api/x")).toBe("https://infinity.id");
  });
});
