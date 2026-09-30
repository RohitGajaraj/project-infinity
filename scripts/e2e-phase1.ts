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
import { b64uDecode, b64uEncode, parseStoredPublicKey } from "../src/lib/jws";
import { bodyHash, createChallenge, signProof, verifyProof } from "../src/lib/pop";

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
const issueRequestId = crypto.randomUUID();
const issueBody = JSON.stringify({
  _name: "Atlas",
  _source: "Claude Code",
  _public_key: storedPub,
  _permissions: ["Send email", "Book appointments"],
  _monthly_spend_limit: 200,
  _approval_above: 50,
  _expires_at: new Date(Date.now() + 180 * 86_400_000).toISOString(),
  _request_id: issueRequestId,
});
const issueOnce = () =>
  fetch(`${SUPABASE_URL}/rest/v1/rpc/issue_agent`, {
    method: "POST",
    headers: authed,
    body: issueBody,
  });
const [created, concurrentRetry] = await Promise.all([issueOnce(), issueOnce()]);
const rows = (await created.json()) as Array<{ id: string; public_id: string }>;
const concurrentRows = (await concurrentRetry.json()) as Array<{ id: string; public_id: string }>;
check("agent and mandate v1 created atomically", created.status === 200 && !!rows[0]);
check(
  "concurrent issue retry returns the same agent",
  concurrentRetry.status === 200 && concurrentRows[0]?.id === rows[0]?.id,
);
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
    source: "Custom / API",
    public_key: storedPub,
    permissions: ["Send email"],
    monthly_spend_limit: 0,
    approval_above: 0,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  }),
});
check(
  "agent owned by another user is rejected",
  spoof.status === 401 || spoof.status === 403,
  `HTTP ${spoof.status}`,
);
const spoofRows = await fetch(`${SUPABASE_URL}/rest/v1/agents?name=eq.Impostor&select=id`, {
  headers: authed,
}).then((response) => response.json() as Promise<unknown[]>);
check("rejected ownership spoof created no agent", spoofRows.length === 0);

// ---------------------------------------------------------------- 4. verify
step("4. What a business sees");
const verify = await fetch(`${APP}/api/public/verify/${agentId}`).then((r) => r.json());
check("status is valid", verify.status === "valid");
check("owner is named", typeof verify.owner?.name === "string");
check("identity_verified is reported honestly as false", verify.owner?.identity_verified === false);
check(
  "mandate is exposed",
  verify.monthly_spend_limit_usd === 200 &&
    verify.approval_above_usd === 50 &&
    verify.mandate_version === 1,
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

step("6b. Proof of possession");
const proofParts = {
  nonce: createChallenge(),
  method: "POST",
  url: "https://shop.example/checkout",
  bodySha256: await bodyHash('{"sku":"abc"}'),
};
const proofSignature = await signProof(pair.privateKey, proofParts);
const holds = good.valid
  ? (await verifyProof(good.subject.publicKey, proofSignature, proofParts)).ok
  : false;
check("agent can prove it holds the key named in its credential", holds);

// ---------------------------------------------------------------- 7. freeze
step("7. Off switch reaches the verifier");
async function setAgentStatus(expected: "valid" | "frozen", next: "valid" | "frozen") {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/set_agent_status`, {
    method: "POST",
    headers: authed,
    body: JSON.stringify({
      _agent_id: rows[0]!.id,
      _expected_status: expected,
      _new_status: next,
    }),
  });
}
await setAgentStatus("valid", "frozen");
const status = await fetch(cred.status_endpoint).then((r) => r.json());
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

// ------------------------------------------------------------------ 9. MCP
step("9. The MCP surface, driven as an agent would");

// Step 7 froze this agent, and a frozen agent is correctly locked out of MCP.
// Unfreeze to exercise the tools, then re-freeze to prove the lockout.
await setAgentStatus("frozen", "valid");
const unfrozen = await fetch(cred.status_endpoint).then((r) => r.json());
check("owner can unfreeze", unfrozen.usable === true);

let rpcId = 0;
const mcpUrl = `${APP.replace(/\/$/, "")}/mcp`;
const protectedTools = new Set([
  "get_limits",
  "record_spend",
  "request_approval",
  "check_approval",
]);
async function rpc(method: string, params?: unknown, token = agentId, withProof = true) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params });
  const headers: Record<string, string> = {
    "content-type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const tool =
    method === "tools/call" &&
    params &&
    typeof params === "object" &&
    "name" in params &&
    typeof params.name === "string"
      ? params.name
      : "";

  if (withProof && token === agentId && protectedTools.has(tool)) {
    const challengeResponse = await fetch(
      `${APP}/api/public/challenge/${encodeURIComponent(agentId)}`,
      { method: "POST" },
    );
    const challenge = (await challengeResponse.json()) as { nonce?: string };
    if (challenge.nonce) {
      headers["Infinity-Nonce"] = challenge.nonce;
      headers["Infinity-Signature"] = await signProof(pair.privateKey, {
        nonce: challenge.nonce,
        method: "POST",
        url: mcpUrl,
        bodySha256: await bodyHash(body),
      });
    }
  }

  const res = await fetch(mcpUrl, { method: "POST", headers, body });
  return {
    status: res.status,
    body: (await res.json().catch(() => null)) as never,
    headers: res.headers,
  };
}
function toolJson(body: { result?: { content?: Array<{ text: string }> } }) {
  return JSON.parse(body.result!.content![0]!.text);
}

const init = await rpc("initialize");
check("initialize succeeds", init.status === 200 && !!init.body.result?.protocolVersion);

const list = await rpc("tools/list");
const toolNames: string[] = (list.body.result?.tools ?? []).map((t: { name: string }) => t.name);
check("all seven tools are advertised", toolNames.length === 7, toolNames.join(", "));

const who = await rpc("tools/call", { name: "whoami", arguments: {} });
const whoOut = toolJson(who.body);
check("whoami returns this agent", whoOut.agent_id === agentId);
check(
  "whoami gives a sentence the agent can say aloud",
  typeof whoOut.how_to_introduce_yourself === "string",
);
check(
  "unverified owner is disclosed rather than hidden",
  /not completed an identity check/i.test(whoOut.how_to_introduce_yourself),
);

const lim = toolJson((await rpc("tools/call", { name: "get_limits", arguments: {} })).body);
check(
  "get_limits returns the mandate",
  lim.monthly_spend_limit_usd === 200 && lim.owner_approval_required_above_usd === 50,
);

const recordedSpend = toolJson(
  (
    await rpc("tools/call", {
      name: "record_spend",
      arguments: { amount_usd: 10, detail: "Lifecycle probe", reference: `life-${Date.now()}` },
    })
  ).body,
);
check("spend is recorded under mandate v1", recordedSpend.allowed === true);

const cheap = toolJson(
  (
    await rpc("tools/call", {
      name: "request_approval",
      arguments: { action: "Book a table", amount_usd: 30 },
    })
  ).body,
);
check("a pre-authorised amount is approved without waking a human", cheap.status === "approved");

const dear = toolJson(
  (
    await rpc("tools/call", {
      name: "request_approval",
      arguments: { action: "Buy a laptop", amount_usd: 5000 },
    })
  ).body,
);
check("an amount over the ceiling is refused, not escalated", dear.status === "denied");

const credViaMcp = toolJson(
  (await rpc("tools/call", { name: "get_credential", arguments: {} })).body,
);
const mcpCheck = await verifyAgentCredential(credViaMcp.credential, jwks, { expectedIssuer: APP });
check("a credential obtained over MCP verifies offline", mcpCheck.valid);

const fake = toolJson(
  (await rpc("tools/call", { name: "verify_agent", arguments: { agent_id: "inf_FAKE-FAKE-FAKE" } }))
    .body,
);
check(
  "verify_agent marks an unknown ID untrustworthy",
  fake.trustworthy === false && fake.verdict === "unknown",
);

const self = await rpc("tools/call", { name: "verify_agent", arguments: { agent_id: agentId } });
check("verify_agent refuses to be used on yourself", self.body.result?.isError === true);

step("9b. MCP authentication");
const noToken = await fetch(`${APP}/mcp`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
});
check("a missing token is rejected", noToken.status === 401);
check(
  "the response says how to authenticate",
  (noToken.headers.get("www-authenticate") ?? "").includes("Bearer"),
);

const badToken = await rpc("tools/list", undefined, "inf_NOT-A-REAL-ID");
check("an unknown token is rejected", badToken.status === 401);

const stolenPublicId = await rpc(
  "tools/call",
  {
    name: "record_spend",
    arguments: { amount_usd: 1, reference: `attack-${Date.now()}` },
  },
  agentId,
  false,
);
check(
  "a copied public Agent ID cannot mutate allowance without the private key",
  stolenPublicId.status === 401 && stolenPublicId.body.error?.message === "proof_required",
);

const allowanceBeforeForgery = await fetch(`${APP}/api/public/allowance/${agentId}`).then((r) =>
  r.json(),
);
const forgedBody = JSON.stringify({
  jsonrpc: "2.0",
  id: ++rpcId,
  method: "tools/call",
  params: {
    name: "record_spend",
    arguments: { amount_usd: 1, reference: `forged-${Date.now()}` },
  },
});
const forgedChallenge = await fetch(`${APP}/api/public/challenge/${encodeURIComponent(agentId)}`, {
  method: "POST",
}).then((r) => r.json() as Promise<{ nonce: string }>);
const forgedProof = await fetch(mcpUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    Authorization: `Bearer ${agentId}`,
    "Infinity-Nonce": forgedChallenge.nonce,
    "Infinity-Signature": "A".repeat(86),
  },
  body: forgedBody,
});
const allowanceAfterForgery = await fetch(`${APP}/api/public/allowance/${agentId}`).then((r) =>
  r.json(),
);
check("a forged protected-call signature is rejected", forgedProof.status === 401);
check(
  "failed proof leaves protected allowance unchanged",
  allowanceAfterForgery.spent_this_month_usd === allowanceBeforeForgery.spent_this_month_usd,
);

const replayBody = JSON.stringify({
  jsonrpc: "2.0",
  id: ++rpcId,
  method: "tools/call",
  params: { name: "get_limits", arguments: {} },
});
const replayChallenge = await fetch(`${APP}/api/public/challenge/${encodeURIComponent(agentId)}`, {
  method: "POST",
}).then((r) => r.json() as Promise<{ nonce: string }>);
const replaySignature = await signProof(pair.privateKey, {
  nonce: replayChallenge.nonce,
  method: "POST",
  url: mcpUrl,
  bodySha256: await bodyHash(replayBody),
});
const replayHeaders = {
  "content-type": "application/json",
  Authorization: `Bearer ${agentId}`,
  "Infinity-Nonce": replayChallenge.nonce,
  "Infinity-Signature": replaySignature,
};
const firstUse = await fetch(mcpUrl, { method: "POST", headers: replayHeaders, body: replayBody });
const secondUse = await fetch(mcpUrl, { method: "POST", headers: replayHeaders, body: replayBody });
check("a valid protected call succeeds", firstUse.status === 200);
check("the identical signed request cannot be replayed", secondUse.status === 401);

async function parallelProtectedCall(id: number) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: "get_limits", arguments: {} },
  });
  const challenge = await fetch(`${APP}/api/public/challenge/${encodeURIComponent(agentId)}`, {
    method: "POST",
  }).then((r) => r.json() as Promise<{ nonce: string }>);
  const signature = await signProof(pair.privateKey, {
    nonce: challenge.nonce,
    method: "POST",
    url: mcpUrl,
    bodySha256: await bodyHash(body),
  });
  return fetch(mcpUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${agentId}`,
      "Infinity-Nonce": challenge.nonce,
      "Infinity-Signature": signature,
    },
    body,
  });
}
const parallel = await Promise.all([
  parallelProtectedCall(++rpcId),
  parallelProtectedCall(++rpcId),
]);
check(
  "parallel protected calls receive independent usable nonces",
  parallel.every((response) => response.status === 200),
);

step("9c. Mandate lifecycle expansion is not exposed before publication");
const directReissue = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reissue_agent_mandate`, {
  method: "POST",
  headers: authed,
  body: JSON.stringify({
    _owner_id: signup.user?.id,
    _agent_id: rows[0]!.id,
    _expected_version: 1,
    _permissions: ["Send email", "Book appointments", "Talk to other agents"],
    _monthly_spend_limit: 150,
    _approval_above: 25,
    _expires_at: verify.expires_at,
    _request_id: crypto.randomUUID(),
    _change_reason: "Direct call must remain unavailable",
  }),
});
check("authenticated clients cannot call service-only reissue", directReissue.status >= 400);

const usageRows = (await fetch(
  `${SUPABASE_URL}/rest/v1/agent_usage?agent_id=eq.${rows[0]!.id}&select=mandate_version`,
  { headers: authed },
).then((r) => r.json())) as Array<{ mandate_version: number }>;
check("usage records the authorizing mandate version", usageRows[0]?.mandate_version === 1);

const directMandateWrite = await fetch(`${SUPABASE_URL}/rest/v1/agents?id=eq.${rows[0]!.id}`, {
  method: "PATCH",
  headers: authed,
  body: JSON.stringify({ monthly_spend_limit: 999999 }),
});
check("direct mandate mutation is denied", directMandateWrite.status >= 400);
const mandateHistory = (await fetch(
  `${SUPABASE_URL}/rest/v1/agent_mandate_versions?agent_id=eq.${rows[0]!.id}&select=version&order=version.asc`,
  { headers: authed },
).then((r) => r.json())) as Array<{ version: number }>;
check(
  "owner sees immutable mandate v1 history",
  mandateHistory.map((row) => row.version).join(",") === "1",
);
const mutateHistory = await fetch(
  `${SUPABASE_URL}/rest/v1/agent_mandate_versions?agent_id=eq.${rows[0]!.id}&version=eq.1`,
  {
    method: "PATCH",
    headers: authed,
    body: JSON.stringify({ monthly_spend_limit: 999999 }),
  },
);
check("owner cannot mutate immutable mandate history", mutateHistory.status >= 400);

// Re-freeze: the off switch must cut the agent off from Infinity itself, not just
// from businesses checking its status.
await setAgentStatus("valid", "frozen");
const afterFreeze = await rpc("tools/call", { name: "whoami", arguments: {} });
check(
  "a frozen agent is locked out of MCP entirely",
  afterFreeze.status === 403,
  `HTTP ${afterFreeze.status}`,
);

step("10. Anonymous callers must not read the tables directly");
for (const table of [
  "agents",
  "profiles",
  "agent_events",
  "owner_attestations",
  "owner_identity_sessions",
  "owner_identity_events",
]) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, { headers: anon });
  const body = (await r.json()) as unknown;
  const empty = Array.isArray(body) && body.length === 0;
  check(`anon sees no rows in ${table}`, empty || r.status >= 400, `HTTP ${r.status}`);
}

step("11. Owner identity flow is bound to auth.uid and privileged finalization");
const beginIdentity = () =>
  fetch(`${SUPABASE_URL}/rest/v1/rpc/begin_owner_identity_session`, {
    method: "POST",
    headers: authed,
    body: JSON.stringify({ _issuer: "didit" }),
  });
const firstIdentity = await beginIdentity();
const firstIdentityRows = (await firstIdentity.json()) as Array<{
  attempt_id: string;
  can_start: boolean;
}>;
const secondIdentity = await beginIdentity();
const secondIdentityRows = (await secondIdentity.json()) as Array<{
  attempt_id: string;
  can_start: boolean;
}>;
check(
  "the first authenticated start allocates one opaque attempt",
  firstIdentity.status === 200 && firstIdentityRows[0]?.can_start === true,
);
check(
  "a retry reuses the attempt without creating another provider session",
  secondIdentity.status === 200 &&
    secondIdentityRows[0]?.attempt_id === firstIdentityRows[0]?.attempt_id &&
    secondIdentityRows[0]?.can_start === false,
);

const identityAttempt = firstIdentityRows[0]?.attempt_id;
const providerReference = crypto.randomUUID();
async function bindIdentity() {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/bind_owner_identity_session`, {
    method: "POST",
    headers: authed,
    body: JSON.stringify({
      _attempt_id: identityAttempt,
      _provider_reference: providerReference,
    }),
  });
}
const firstBind = await bindIdentity();
const secondBind = await bindIdentity();
check("the owner can bind the provider session", firstBind.status === 200);
check(
  "an exact provider bind retry is idempotent",
  secondBind.status === 200 && (await secondBind.json()) === true,
);

const ownerIdentityStatus = await fetch(`${SUPABASE_URL}/rest/v1/rpc/owner_identity_status`, {
  method: "POST",
  headers: authed,
  body: "{}",
});
check("the owner can read their own accountability state", ownerIdentityStatus.status === 200);

const anonymousBegin = await fetch(`${SUPABASE_URL}/rest/v1/rpc/begin_owner_identity_session`, {
  method: "POST",
  headers: anon,
  body: JSON.stringify({ _issuer: "didit" }),
});
check("anonymous callers cannot allocate owner attempts", anonymousBegin.status >= 400);

const anonymousFinalize = await fetch(
  `${SUPABASE_URL}/rest/v1/rpc/finalize_owner_identity_session`,
  {
    method: "POST",
    headers: anon,
    body: JSON.stringify({
      _attempt_id: crypto.randomUUID(),
      _issuer: "didit",
      _provider_reference: crypto.randomUUID(),
      _event_id: crypto.randomUUID(),
      _occurred_at: new Date().toISOString(),
      _outcome: "approved",
      _method: "government_id_and_liveness",
      _assurance: "high",
      _subject_country: "",
    }),
  },
);
check("only service_role can finalize an owner attestation", anonymousFinalize.status >= 400);

const authenticatedFinalize = await fetch(
  `${SUPABASE_URL}/rest/v1/rpc/finalize_owner_identity_session`,
  {
    method: "POST",
    headers: authed,
    body: JSON.stringify({
      _attempt_id: identityAttempt,
      _issuer: "didit",
      _provider_reference: providerReference,
      _event_id: crypto.randomUUID(),
      _occurred_at: new Date().toISOString(),
      _outcome: "approved",
      _method: "government_id_and_liveness",
      _assurance: "high",
      _subject_country: "",
    }),
  },
);
check(
  "authenticated owners cannot self-finalize an attestation",
  authenticatedFinalize.status >= 400,
);

const legacyRecorder = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_owner_attestation`, {
  method: "POST",
  headers: authed,
  body: JSON.stringify({
    _owner_id: signup.user?.id,
    _issuer: "didit",
    _method: "government_id_and_liveness",
    _assurance: "high",
    _reference: crypto.randomUUID(),
    _subject_country: "",
    _valid_months: 12,
  }),
});
check(
  "the superseded unbound attestation recorder is not executable",
  legacyRecorder.status >= 400,
);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
