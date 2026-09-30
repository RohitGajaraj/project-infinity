/**
 * Live database probe for the owner-accountability migration.
 *
 * Uses only the public key plus a disposable authenticated user. It proves the
 * owner-derived/RLS/ACL boundaries without exposing or requiring service_role.
 * The service-role finalizer is exercised separately by a signed Didit sandbox
 * delivery after secrets are configured.
 */

const SUPABASE_URL = process.env["SUPABASE_URL"];
const KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
if (!SUPABASE_URL || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const anon = { apikey: KEY, "content-type": "application/json" };
let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

console.log("\n1. Create a disposable authenticated owner");
const email = `identity-e2e-${Date.now()}@infinitytest.io`;
const signupResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
  method: "POST",
  headers: anon,
  body: JSON.stringify({ email, password: "Testing12345!aA" }),
});
const signup = (await signupResponse.json()) as {
  access_token?: string;
  user?: { id?: string };
};
check("signup returns a session", !!signup.access_token);
if (!signup.access_token || !signup.user?.id) process.exit(1);
const authed = { ...anon, Authorization: `Bearer ${signup.access_token}` };

console.log("\n2. Begin is owner-derived, bounded, and retry-safe");
async function begin() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/begin_owner_identity_session`, {
    method: "POST",
    headers: authed,
    body: JSON.stringify({ _issuer: "didit" }),
  });
  const rows = (await response.json()) as Array<{
    attempt_id?: string;
    can_start?: boolean;
  }>;
  return { response, row: rows[0] };
}
const first = await begin();
const second = await begin();
check(
  "first start allocates one opaque attempt",
  first.response.ok && first.row?.can_start === true,
);
check(
  "retry reuses the active attempt without another provider session",
  second.response.ok &&
    second.row?.attempt_id === first.row?.attempt_id &&
    second.row?.can_start === false,
);

console.log("\n3. Provider binding is owner-scoped and idempotent");
const providerReference = crypto.randomUUID();
async function bind() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/bind_owner_identity_session`, {
    method: "POST",
    headers: authed,
    body: JSON.stringify({
      _attempt_id: first.row?.attempt_id,
      _provider_reference: providerReference,
    }),
  });
  return { response, body: await response.json() };
}
const firstBind = await bind();
const secondBind = await bind();
check(
  "owner can bind the opaque provider reference",
  firstBind.response.ok && firstBind.body === true,
);
check("exact bind retry is a successful no-op", secondBind.response.ok && secondBind.body === true);

const statusResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/owner_identity_status`, {
  method: "POST",
  headers: authed,
  body: "{}",
});
const statusRows = (await statusResponse.json()) as Array<{ state?: string }>;
check(
  "owner reads the active accountability state",
  statusResponse.ok && statusRows[0]?.state === "in_progress",
);

console.log("\n4. Anonymous and authenticated roles cannot forge finalization");
const finalizerBody = JSON.stringify({
  _attempt_id: first.row?.attempt_id,
  _issuer: "didit",
  _provider_reference: providerReference,
  _event_id: crypto.randomUUID(),
  _occurred_at: new Date().toISOString(),
  _outcome: "approved",
  _method: "government_id_and_liveness",
  _assurance: "high",
  _subject_country: "",
});
for (const [label, headers] of [
  ["anonymous", anon],
  ["authenticated owner", authed],
] as const) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/finalize_owner_identity_session`, {
    method: "POST",
    headers,
    body: finalizerBody,
  });
  check(`${label} cannot call the service-only finalizer`, response.status >= 400);
}

const legacy = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_owner_attestation`, {
  method: "POST",
  headers: authed,
  body: JSON.stringify({
    _owner_id: signup.user.id,
    _issuer: "didit",
    _method: "government_id_and_liveness",
    _assurance: "high",
    _reference: crypto.randomUUID(),
    _subject_country: "",
    _valid_months: 12,
  }),
});
check("superseded owner-ID recorder is not executable", legacy.status >= 400);

console.log("\n5. Anonymous callers cannot read accountability tables");
for (const table of ["owner_attestations", "owner_identity_sessions", "owner_identity_events"]) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: anon,
  });
  const body = (await response.json()) as unknown;
  const empty = Array.isArray(body) && body.length === 0;
  check(
    `anon sees no rows in ${table}`,
    empty || response.status >= 400,
    `HTTP ${response.status}`,
  );
}

console.log(
  `\n${failures === 0 ? "OWNER IDENTITY PROBE PASSED" : `${failures} CHECK(S) FAILED`}\n`,
);
process.exit(failures === 0 ? 0 : 1);
