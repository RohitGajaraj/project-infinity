/**
 * Phase-1 end-to-end check against the LIVE database and a running dev server.
 *
 *   bun run dev            # in another terminal
 *   bun run e2e
 *
 * Exists because AGENTS.md requires probing the live database after a migration
 * rather than trusting a report. Supaprod shipped nine features that did nothing
 * in production and none was caught by reading code.
 *
 * Walks the real path: owner signs up, agent is issued, then a third party
 * verifies the credential the way a business would — including the forgery and
 * ownership-bypass attempts that must fail.
 */

import { verifyAgentCredential } from "../src/lib/credential";
import { parseStoredPublicKey, verifyRawEd25519, b64uDecode, b64uEncode } from "../src/lib/jws";

const SUPABASE_URL = process.env["SUPABASE_URL"];
const KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
const APP = process.env["E2E_APP_ORIGIN"] ?? "http://localhost:8080";

if (!SUPABASE_URL || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY in the environment.");
  process.exit(1);
}

const anon = { apikey: KEY, "content-type": "application/json" };
let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}
function step(n: string) {
  console.log(`\n${n}`);
}

// ---------------------------------------------------------------- 1. owner
step("1. Owner signs up");
const email = `kiro-e2e-${Date.now()}@infinitytest.io`;
const signup = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
  method: "POST",
  headers: anon,
  body: JSON.stringify({ email, password: "Testing12345!aA" }),
}).then((r) => r.json());

const token = signup.access_token as string | undefined;
check("session returned without email confirmation", !!token);
if (!token) {
  console.error("  cannot continue:", JSON.stringify(signup).slice(0, 240));
  process.exit(1);
}
const authed = { ...anon, Authorization: `Bearer ${token}` };

// ---------------------------------------------------------------- 2. keypair
step("2. Agent keypair, generated the way the browser does");
const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
  "sign",
  "verify",
])) as CryptoKeyPair;
const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
const storedPub = `ed25519:${btoa(String.fromCharCode(...rawPub))}`;
check("public key is 32 raw bytes", parseStoredPublicKey(storedPub)?.length === 32);

// ---------------------------------------------------------------- 3. issue
step("3. Issue the agent");
const created = await fetch(`${SUPABASE_URL}/rest/v1/agents?select=id,public_id,owner_id`, {
  method: "POST",
  headers: { ...authed, Prefer: "return=representation" },
  body: JSON.stringify({
    name: "Atlas",
    source: "Claude Code",
    public_key: storedPub,
    permissions: ["Send email", "Book appointments"],
    monthly_spend_limit: 200,
    approval_above: 50,
  }),
});
const rows = (await created.json()) as Array<{ id: string; public_id: string }>;
check("agent created", created.status === 201 && Array.isArray(rows) && !!rows[0]);
if (!rows?.[0]) {
  console.error("  cannot continue:", JSON.stringify(rows).slice(0, 240));
  process.exit(1);
}
const agentId = rows[0].public_id;
console.log(`        agent id: ${agentId}`);

step("3b. Ownership must be pinned even when the client lies");
const spoof = await fetch(`${SUPABASE_URL}/rest/v1/agents`, {
  method: "POST",
  headers: authed,
  body: JSON.stringify({
    owner_id: "00000000-0000-0000-0000-000000000001",
    name: "Impostor",
    source: "custom",
    public_key: "ed25519:AAAA",
  }),
});
check(
  "agent owned by another user is rejected",
  spoof.status === 401 || spoof.status === 403,
  `HTTP ${spoof.status}`,
);

// ---------------------------------------------------------------- 4. verify
step("4. What a business sees");
const verify = await fetch(`${APP}/api/public/verify/${agentId}`).then((r) => r.json());
check("status is valid", verify.status === "valid");
check("owner is named", typeof verify.owner?.name === "string");
check("identity_verified is reported honestly as false", verify.owner?.identity_verified === false);
check(
  "mandate is exposed",
  verify.monthly_spend_limit_usd === 200 && verify.approval_above_usd === 50,
);

// ---------------------------------------------------------------- 5. offline
step("5. Credential verifies offline against the published keys");
const cred = await fetch(`${APP}/api/public/credential/${agentId}`).then((r) => r.json());
const jwks = await fetch(`${APP}/.well-known/jwks.json`).then((r) => r.json());
console.log(`        key_mode: ${cred.key_mode} (provisional: ${cred.provisional})`);

const good = await verifyAgentCredential(cred.credential, jwks, { expectedIssuer: APP });
check("signature valid", good.valid, good.valid ? "" : (good as { reason: string }).reason);
if (good.valid) {
  check("subject is this agent", good.subject.id === agentId);
  check("agent's own key is inside the credential", good.subject.publicKey === storedPub);
  check("mandate is inside the signed payload", good.subject.mandate.monthlySpendLimitUsd === 200);
  check("credential names a live status endpoint", good.statusUrl.includes(`/status/${agentId}`));
}

// ---------------------------------------------------------------- 6. forgery
step("6. Forgery must fail");
const [h, p, s] = cred.credential.split(".") as [string, string, string];
const payload = JSON.parse(new TextDecoder().decode(b64uDecode(p)));
payload.vc.credentialSubject.mandate.monthlySpendLimitUsd = 999_999;
const forged = `${h}.${b64uEncode(new TextEncoder().encode(JSON.stringify(payload)))}.${s}`;
const bad = await verifyAgentCredential(forged, jwks);
check(
  "raising the spend limit breaks the signature",
  !bad.valid,
  bad.valid ? "ACCEPTED" : (bad as { reason: string }).reason,
);

step("6b. Proof of possession (the gap this phase still has)");
const challenge = new TextEncoder().encode(`nonce-${Date.now()}`);
const sig = new Uint8Array(
  await crypto.subtle.sign({ name: "Ed25519" }, pair.privateKey, challenge),
);
const holds = good.valid
  ? await verifyRawEd25519(challenge, sig, parseStoredPublicKey(good.subject.publicKey)!)
  : false;
check("agent can prove it holds the key named in its credential", holds);
console.log(
  "        note: the primitive works, but no endpoint issues challenges yet (DIRECTION.md §10.4)",
);

// ---------------------------------------------------------------- 7. freeze
step("7. Off switch reaches the verifier");
await fetch(`${SUPABASE_URL}/rest/v1/agents?public_id=eq.${agentId}`, {
  method: "PATCH",
  headers: authed,
  body: JSON.stringify({ status: "frozen" }),
});
const status = await fetch(`${APP}/api/public/status/${agentId}`).then((r) => r.json());
check("status flips to frozen", status.status === "frozen");
check("usable is false", status.usable === false);

// ---------------------------------------------------------------- 8. chain
step("8. Activity log is chained");
const events = (await fetch(
  `${SUPABASE_URL}/rest/v1/agent_events?select=kind,detail,prev_hash,hash&order=id.asc`,
  { headers: authed },
).then((r) => r.json())) as Array<{ kind: string; prev_hash: string; hash: string }>;

check("issuance and freeze are both logged", events.length >= 2, `${events.length} entries`);
check("first entry chains to genesis", events[0]?.prev_hash === "genesis");
let linked = true;
for (let i = 1; i < events.length; i++) {
  if (events[i]!.prev_hash !== events[i - 1]!.hash) linked = false;
}
check("every entry links to the previous hash", linked);
for (const e of events) console.log(`        ${e.kind.padEnd(10)} ${e.hash.slice(0, 16)}…`);

step("9. Anonymous callers must not read the tables directly");
for (const table of ["agents", "profiles", "agent_events"]) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, { headers: anon });
  const body = (await r.json()) as unknown;
  const empty = Array.isArray(body) && body.length === 0;
  check(`anon sees no rows in ${table}`, empty || r.status >= 400, `HTTP ${r.status}`);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
