import { afterEach, describe, expect, test } from "bun:test";

import {
  ISSUER_ENV_VAR,
  IssuerNotConfiguredError,
  isIssuerConfigured,
  issueAgentCredential,
  issuerMetadata,
  issuerOrigin,
  publicJwks,
} from "./issuer.server";
import { generateIssuerKeypair } from "./jws";
import { verifyAgentCredential, type CredentialSource } from "./credential";

const ORIGIN = "https://infinity.id";

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

async function configureIssuer() {
  const { privateJwk } = await generateIssuerKeypair();
  process.env[ISSUER_ENV_VAR] = JSON.stringify(privateJwk);
  return privateJwk;
}

afterEach(() => {
  delete process.env[ISSUER_ENV_VAR];
  delete process.env["INFINITY_ISSUER_ORIGIN"];
});

describe("issuer configuration", () => {
  test("reports unconfigured when the secret is absent", () => {
    delete process.env[ISSUER_ENV_VAR];
    expect(isIssuerConfigured()).toBe(false);
    expect(publicJwks().keys).toHaveLength(0);
  });

  test("refuses to issue rather than emitting an unsigned credential", async () => {
    delete process.env[ISSUER_ENV_VAR];
    await expect(issueAgentCredential(AGENT, ORIGIN)).rejects.toBeInstanceOf(
      IssuerNotConfiguredError,
    );
  });

  test("rejects a malformed secret loudly", async () => {
    process.env[ISSUER_ENV_VAR] = "not json";
    expect(() => publicJwks()).toThrow(/valid JSON/);
    process.env[ISSUER_ENV_VAR] = JSON.stringify({ kty: "RSA" });
    expect(() => publicJwks()).toThrow(/must be an Ed25519 private JWK/);
  });

  test("picks up a rotated secret without a restart", async () => {
    const first = await configureIssuer();
    expect(publicJwks().keys[0]!.kid).toBe(first.kid!);
    const second = await configureIssuer();
    expect(publicJwks().keys[0]!.kid).toBe(second.kid!);
    expect(second.kid).not.toBe(first.kid);
  });
});

describe("published key set", () => {
  test("never contains private material", async () => {
    const priv = await configureIssuer();
    const serialised = JSON.stringify(publicJwks());
    expect(serialised).not.toContain(priv.d);
    expect(serialised).toContain(priv.x);
  });
});

describe("end-to-end issue then verify", () => {
  test("a credential issued by the server verifies against the served JWKS", async () => {
    await configureIssuer();
    const jws = await issueAgentCredential(AGENT, ORIGIN);
    const result = await verifyAgentCredential(jws, publicJwks(), {
      now: NOW,
      expectedIssuer: ORIGIN,
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.subject.id).toBe(AGENT.public_id);
    // The unverified owner must be reported honestly inside the signed payload.
    expect(result.subject.owner.identityVerified).toBe(false);
  });

  test("a credential from the previous key fails against a rotated key set", async () => {
    await configureIssuer();
    const jws = await issueAgentCredential(AGENT, ORIGIN);
    await configureIssuer(); // rotate
    const result = await verifyAgentCredential(jws, publicJwks(), { now: NOW });
    expect(result.valid).toBe(false);
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

  test("metadata advertises the key set and signals configuration state", async () => {
    await configureIssuer();
    const meta = issuerMetadata(ORIGIN);
    expect(meta.issuer).toBe(ORIGIN);
    expect(meta.jwks_uri).toBe(`${ORIGIN}/.well-known/jwks.json`);
    expect(meta.signing_alg_values_supported).toEqual(["EdDSA"]);
    expect(meta.configured).toBe(true);
  });
});
