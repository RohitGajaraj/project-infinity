/**
 * Owner identity attestations.
 *
 * "Verified" on its own is unfalsifiable — verified by whom, how, and when? A
 * business deciding whether to accept a $5,000 purchase needs to know it was a
 * government ID with liveness checked last week, not a self-declaration from two
 * years ago. So an attestation names its issuer, its method, its strength and its
 * date, and the credential carries all four.
 *
 * **These claims are operator-asserted.** Unlike the signature over a credential,
 * a third party cannot check an attestation offline; it rests on our word plus the
 * provider's. Every surface that shows one must say so. That is the same
 * distinction we already enforce between signing and hash-chaining.
 *
 * Pure module: no dependencies, no server imports, no secrets.
 */

/** Who asserts the attestation. `self_declared` is the honest label for unchecked. */
export type AttestationIssuer = "self_declared" | "didit" | "persona" | "sumsub" | "manual_review";

/** What was actually checked. */
export type AttestationMethod =
  | "none"
  | "email_only"
  | "government_id"
  | "government_id_and_liveness"
  | "business_registry"
  | "business_registry_and_ubo";

/** How much weight the check carries. eIDAS-style, so a verifier can set its bar. */
export type AssuranceLevel = "none" | "basic" | "substantial" | "high";

export type OwnerAttestation = {
  issuer: AttestationIssuer;
  method: AttestationMethod;
  assurance: AssuranceLevel;
  /** ISO-8601, or null when nothing has been checked. */
  verifiedAt: string | null;
  /**
   * Always true for this field. Present in the payload so a verifier reading the
   * credential cannot mistake it for something they can check themselves.
   */
  operatorAsserted: true;
};

export const UNVERIFIED: OwnerAttestation = {
  issuer: "self_declared",
  method: "email_only",
  assurance: "none",
  verifiedAt: null,
  operatorAsserted: true,
};

const ASSURANCE_RANK: Record<AssuranceLevel, number> = {
  none: 0,
  basic: 1,
  substantial: 2,
  high: 3,
};

/** Does this attestation meet a verifier's minimum bar? */
export function meetsAssurance(attestation: OwnerAttestation, minimum: AssuranceLevel): boolean {
  return ASSURANCE_RANK[attestation.assurance] >= ASSURANCE_RANK[minimum];
}

/** The assurance a given method can support. Keeps issuers from over-claiming. */
export function assuranceForMethod(method: AttestationMethod): AssuranceLevel {
  switch (method) {
    case "none":
    case "email_only":
      return "none";
    case "government_id":
    case "business_registry":
      return "substantial";
    case "government_id_and_liveness":
    case "business_registry_and_ubo":
      return "high";
  }
}

/** One sentence a person or a model can act on. */
export function describeAttestation(attestation: OwnerAttestation): string {
  if (attestation.assurance === "none") {
    return "This owner has confirmed an email address only. Their legal identity has not been checked.";
  }
  const when = attestation.verifiedAt
    ? new Date(attestation.verifiedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "an unrecorded date";

  const what: Record<AttestationMethod, string> = {
    none: "nothing",
    email_only: "an email address",
    government_id: "a government-issued ID",
    government_id_and_liveness: "a government-issued ID with a liveness check",
    business_registry: "a company registry record",
    business_registry_and_ubo: "a company registry record and its beneficial owners",
  };

  return `${what[attestation.method]} was checked by ${ISSUER_NAMES[attestation.issuer]} on ${when}. Infinity asserts this; it is not independently verifiable.`;
}

export const ISSUER_NAMES: Record<AttestationIssuer, string> = {
  self_declared: "the owner themselves",
  didit: "Didit",
  persona: "Persona",
  sumsub: "Sumsub",
  manual_review: "Infinity staff",
};

/** Short label for a badge. */
export function attestationLabel(attestation: OwnerAttestation): string {
  switch (attestation.assurance) {
    case "none":
      return "identity not checked";
    case "basic":
      return "identity partly checked";
    case "substantial":
      return "identity verified";
    case "high":
      return "identity verified with liveness";
  }
}

/**
 * Build an attestation from the row `verify_agent` returns.
 *
 * Tolerates nulls throughout, because an owner with no attestation is the normal
 * starting state rather than an error.
 */
export function attestationFromRow(row: {
  owner_attestation_issuer?: string | null;
  owner_attestation_method?: string | null;
  owner_attestation_assurance?: string | null;
  owner_attestation_verified_at?: string | null;
}): OwnerAttestation {
  const issuer = row.owner_attestation_issuer;
  const method = row.owner_attestation_method;
  const assurance = row.owner_attestation_assurance;

  if (!issuer || !method || !assurance || assurance === "none") return UNVERIFIED;
  if (!isIssuer(issuer) || !isMethod(method) || !isAssurance(assurance)) return UNVERIFIED;

  return {
    issuer,
    method,
    assurance,
    verifiedAt: row.owner_attestation_verified_at ?? null,
    operatorAsserted: true,
  };
}

function isIssuer(value: string): value is AttestationIssuer {
  return value in ISSUER_NAMES;
}
function isMethod(value: string): value is AttestationMethod {
  return [
    "none",
    "email_only",
    "government_id",
    "government_id_and_liveness",
    "business_registry",
    "business_registry_and_ubo",
  ].includes(value);
}
function isAssurance(value: string): value is AssuranceLevel {
  return value in ASSURANCE_RANK;
}

// ------------------------------------------------------------------- PII

/**
 * Fields identity providers commonly send in a webhook that we must never store.
 *
 * The claim "no document or personal detail reaches our database" has to be
 * implemented, not asserted: provider payloads carry extracted PII by default.
 */
/**
 * Normalise a field name so `full_name`, `fullName`, `FullName` and `full-name`
 * all collapse to one key. Providers differ on convention, and a redaction list
 * that only matches snake_case is a redaction list with holes.
 */
function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const PII_KEYS = new Set(
  [
    "first_name",
    "last_name",
    "full_name",
    "name",
    "date_of_birth",
    "dob",
    "document_number",
    "documentnumber",
    "id_number",
    "address",
    "place_of_birth",
    "nationality",
    "gender",
    "phone",
    "phone_number",
    "email",
    "portrait_image",
    "front_image",
    "back_image",
    "selfie",
    "images",
    "raw",
    "extracted_data",
    "personal_details",
  ].map(normaliseKey),
);

/**
 * Strip PII from a provider payload, recursively, before anything is logged or
 * persisted. Keeps only structural fields.
 */
export function stripPii<T>(payload: T): T {
  return walk(payload) as T;
}

function walk(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEYS.has(normaliseKey(key))) {
        out[key] = "[redacted]";
        continue;
      }
      out[key] = walk(inner);
    }
    return out;
  }
  return value;
}
