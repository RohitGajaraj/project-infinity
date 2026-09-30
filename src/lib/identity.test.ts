import { describe, expect, test } from "bun:test";

import {
  assuranceForMethod,
  attestationFromRow,
  attestationLabel,
  describeAttestation,
  meetsAssurance,
  stripPii,
  UNVERIFIED,
  type OwnerAttestation,
} from "./identity";

const HIGH: OwnerAttestation = {
  issuer: "didit",
  method: "government_id_and_liveness",
  assurance: "high",
  verifiedAt: "2026-09-20T00:00:00.000Z",
  expiresAt: "2027-09-20T00:00:00.000Z",
  operatorAsserted: true,
};

describe("assurance", () => {
  test("a method cannot claim more assurance than it earns", () => {
    expect(assuranceForMethod("none")).toBe("none");
    expect(assuranceForMethod("email_only")).toBe("none");
    expect(assuranceForMethod("government_id")).toBe("substantial");
    expect(assuranceForMethod("government_id_and_liveness")).toBe("high");
    expect(assuranceForMethod("business_registry")).toBe("substantial");
    expect(assuranceForMethod("business_registry_and_ubo")).toBe("high");
  });

  test("a verifier can set its own bar and have it respected", () => {
    expect(meetsAssurance(HIGH, "substantial")).toBe(true);
    expect(meetsAssurance(HIGH, "high")).toBe(true);
    expect(meetsAssurance(UNVERIFIED, "basic")).toBe(false);
    expect(meetsAssurance({ ...HIGH, assurance: "basic" }, "substantial")).toBe(false);
  });

  test("an unverified owner meets only a bar of none", () => {
    expect(meetsAssurance(UNVERIFIED, "none")).toBe(true);
  });
});

describe("reading an attestation off a verify_agent row", () => {
  test("a complete row becomes an attestation", () => {
    const a = attestationFromRow({
      owner_attestation_issuer: "didit",
      owner_attestation_method: "government_id_and_liveness",
      owner_attestation_assurance: "high",
      owner_attestation_verified_at: "2026-09-20T00:00:00.000Z",
      owner_attestation_expires_at: "2027-09-20T00:00:00.000Z",
    });
    expect(a).toEqual(HIGH);
  });

  test("an absent attestation is the normal starting state, not an error", () => {
    expect(attestationFromRow({})).toEqual(UNVERIFIED);
    expect(attestationFromRow({ owner_attestation_issuer: null })).toEqual(UNVERIFIED);
  });

  test("an unrecognised issuer is rejected rather than passed through", () => {
    // Otherwise a bad row could assert high assurance from an issuer we never used.
    const a = attestationFromRow({
      owner_attestation_issuer: "totally-legit-verifier",
      owner_attestation_method: "government_id",
      owner_attestation_assurance: "high",
    });
    expect(a).toEqual(UNVERIFIED);
  });

  test("an unrecognised method or assurance is rejected", () => {
    expect(
      attestationFromRow({
        owner_attestation_issuer: "didit",
        owner_attestation_method: "vibes",
        owner_attestation_assurance: "high",
      }),
    ).toEqual(UNVERIFIED);
    expect(
      attestationFromRow({
        owner_attestation_issuer: "didit",
        owner_attestation_method: "government_id",
        owner_attestation_assurance: "extremely_high",
      }),
    ).toEqual(UNVERIFIED);
  });

  test("assurance of none collapses to unverified regardless of the rest", () => {
    expect(
      attestationFromRow({
        owner_attestation_issuer: "didit",
        owner_attestation_method: "government_id",
        owner_attestation_assurance: "none",
      }),
    ).toEqual(UNVERIFIED);
  });
});

describe("how it reads to a person or a model", () => {
  test("an unverified owner is described plainly, not euphemistically", () => {
    const text = describeAttestation(UNVERIFIED);
    expect(text).toMatch(/has not been checked/i);
    expect(attestationLabel(UNVERIFIED)).toBe("identity not checked");
  });

  test("a verified owner's description names the issuer, the method and the date", () => {
    const text = describeAttestation(HIGH);
    expect(text).toContain("Didit");
    expect(text).toMatch(/liveness/i);
    expect(text).toContain("2026");
  });

  test("every description states that Infinity asserts it and it is not independently verifiable", () => {
    // The one sentence that keeps this honest next to a signature that IS checkable.
    expect(describeAttestation(HIGH)).toMatch(/not independently verifiable/i);
  });

  test("labels distinguish assurance levels", () => {
    expect(attestationLabel({ ...HIGH, assurance: "substantial" })).toBe("identity verified");
    expect(attestationLabel(HIGH)).toBe("identity verified with liveness");
  });
});

describe("PII stripping — the claim has to be implemented, not asserted", () => {
  test("redacts personal fields from a provider payload", () => {
    const payload = {
      session_id: "sess_123",
      status: "Approved",
      first_name: "Rohit",
      last_name: "G",
      date_of_birth: "1990-01-01",
      document_number: "X1234567",
      location: { document_country_code: "GB" },
    };
    const safe = stripPii(payload) as Record<string, unknown>;
    expect(safe["session_id"]).toBe("sess_123");
    expect(safe["status"]).toBe("Approved");
    expect(safe["first_name"]).toBe("[redacted]");
    expect(safe["date_of_birth"]).toBe("[redacted]");
    expect(safe["document_number"]).toBe("[redacted]");
  });

  test("redacts nested PII, since providers nest it", () => {
    const safe = stripPii({
      decision: { kyc: { full_name: "Rohit G", extracted_data: { dob: "1990" } } },
    }) as { decision: { kyc: Record<string, unknown> } };
    expect(safe.decision.kyc["full_name"]).toBe("[redacted]");
    expect(safe.decision.kyc["extracted_data"]).toBe("[redacted]");
  });

  test("redacts inside arrays", () => {
    const safe = stripPii({ people: [{ name: "A" }, { name: "B" }] }) as {
      people: Array<Record<string, unknown>>;
    };
    expect(safe.people.map((p) => p["name"])).toEqual(["[redacted]", "[redacted]"]);
  });

  test("is case-insensitive about field names", () => {
    const safe = stripPii({ FullName: "x", DOB: "y" }) as Record<string, unknown>;
    expect(safe["FullName"]).toBe("[redacted]");
    expect(safe["DOB"]).toBe("[redacted]");
  });

  test("keeps the structural fields a verdict needs", () => {
    const safe = stripPii({ session_id: "s", status: "Approved", features: "KYB" }) as Record<
      string,
      unknown
    >;
    expect(safe).toEqual({ session_id: "s", status: "Approved", features: "KYB" });
  });

  test("leaves primitives and nulls alone", () => {
    expect(stripPii("hello")).toBe("hello");
    expect(stripPii(null)).toBeNull();
    expect(stripPii(42)).toBe(42);
  });
});
