# Status board

Maintained by the supervisor. Kiro: read this before every task and do not edit it. Protocol is in
[`README.md`](README.md).

**Updated:** 2026-09-30 11:01 UTC · **`main` at:** `b8faa8f` · **Production:** `91a2c1b` or later (see founder item 1)

## Live system, verified by probe

| Check | Result | Evidence |
| --- | --- | --- |
| Migrations applied | 11/11. `0000` is Lovable's baseline; `0001`–`0010` mirror all 10 files in `supabase/migrations/` | `drizzle.__drizzle_migrations` hashes match `drizzle/migrations/*.sql` |
| Mirror fidelity | All 10 semantically identical to source. `0005` uses `create` where the source uses `create or replace`, with the same effect | Comment- and whitespace-normalised diff |
| Pending migrations | None | No source file lacks a mirror |
| Owner-identity grants (`0010`) | anon: no execute on any of the six functions. `finalize_owner_identity_session`: service_role only. Legacy `record_owner_attestation`: disabled | `has_function_privilege` on the live DB |
| Earlier boundaries | `record_signed_action` and `current_owner_attestation`: not callable by anon or authenticated. `verify_agent`: public, by design | Same probe |
| Tables | RLS on for `owner_attestations`, `owner_identity_sessions` and `owner_identity_events`; anon has no select | `has_table_privilege`, `relrowsecurity` |
| Production URL | **https://infinityalpha.lovable.app**. The old `infinity-unbound-core` slug was renamed and now returns 404 | Fetched `/.well-known/infinity-issuer.json` |
| Issuer key | `key_mode: provisional`. `INFINITY_ISSUER_JWK` and `INFINITY_ISSUER_SEED` are not set; `INFINITY_ISSUER_ORIGIN` is | Issuer metadata; Lovable's secret list (names only) |
| Didit secrets | `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`, `DIDIT_WORKFLOW_ID` and `DIDIT_ENVIRONMENT` are present in Lovable's store | Lovable's secret list (names only) |
| Didit webhook | Reachable on production. An unsigned POST gets the handler's own `401 {"error":"invalid_webhook"}`, so no sign-in wall is in front of it | `curl -X POST /api/webhooks/didit` |
| Challenge ledger (`0009`) | `issue_agent_challenge` and `record_signed_action` are service_role only. `agent_challenges` has RLS on, with no anon/authenticated select | `has_function_privilege`, `has_table_privilege` |
| **Sandbox owner flow (§19.9 item 1)** | **Closed.** A real signed Didit sandbox delivery reached the production webhook and was finalized by the service role: one `approved` session, and an attestation `didit · government_id_and_liveness · high`, expiring 2027-09-30 | `verify_agent('inf_7PVD-2ZPP-QNRL')`; `owner_identity_sessions` counts (no PII read) |
| Sandbox agent `inf_7PVD-2ZPP-QNRL` | Public status is `frozen`, `usable: false`. The VC-JWT carries `nameSource: self_declared`, `operatorAsserted: true` and the canonical status URL | `/api/public/status`, `/api/public/verify`, decoded `/api/public/credential` |
| Quality gates on `fec4661` | tsc pass · lint 0 errors (7 existing warnings) · `bun test` 201/201 · build pass | Supervisor's clean clone |

## Blocked on the founder

1. **Publish `fec4661`** (Lovable → Publish → Update). It carries the R1 hardening: an unsigned test
   header can no longer suppress a real Didit verdict. Review: PASS. Then send one more signed Didit
   console test, and expect HTTP 200. The supervisor cannot publish (auto mode) and will not ask
   Lovable to publish on your behalf.
2. ~~Point Didit's webhook at production~~ and 3. ~~run the sandbox flow~~: **done**, verified live
   (see *Sandbox owner flow* above).
4. **Before any real user relies on a credential:** run `bun run keygen` and put the result in
   `INFINITY_ISSUER_JWK` in Lovable's secret store. Production signs in provisional mode today.
5. **Reported by Lovable, not yet verified:** email confirmation is off (a launch blocker), and the
   security scan is out of date for this version.
6. **Local only:** the working tree's `.env` holds `DIDIT_*` values. They are uncommitted, and a local
   pre-commit hook now refuses to commit them. Move them to `.env.local`, which is gitignored.

## Reviews

| Commit | Scope | Verdict | Notes |
| --- | --- | --- | --- |
| `fec4661` | R1 webhook hardening, R2 docs, §19.10 | **PASS with notes** | R1 closed: the test header is honored only for non-production-shaped bodies, and the regression test covers the replay. R2 closed. Note R3 below |
| `91a2c1b` | Didit test-webhook acceptance (`identity-provider.server.ts`) | **PASS with notes** | Freshness (±300 s, header = body timestamp) and HMAC run before the test branch. `{test: true}` returns 200 at the route and cannot reach `finalize_owner_identity_session`. Safe to publish. Note R1 below |

## Needs Kiro

- **R3 (docs accuracy, low, non-blocking).** DIRECTION §17.4 now reads: *"The supervisor verified
  mirror fidelity, grants and the live database state; signed MCP requests and the public-ID
  impersonation probe pass."* The supervisor verified the mirrors and the `0009`/`0010` grants. It did
  **not** run the signed-MCP or impersonation probe, which came from Kiro's own run. Attribute that
  clause to its real source, for example "passed in Kiro's §17.4 probe; not re-run by the supervisor".
  AGENTS.md: *"Claims … must be backed by code."*
- R1 and R2: **closed** in `fec4661`.
- **R4 (rule drift, low, non-blocking, predates this work).** AGENTS.md says `jws.ts` and
  `credential.ts` are pure and a verifier *"must be able to vendor those two files. Do not import
  anything else into them."* Since `b41ca44`, `credential.ts` has imported `./identity`, and `verifier.ts`
  needs `pop.ts` too. All four files are still dependency-free, so the spirit holds and the letter does
  not. Update the AGENTS.md rule to name the actual vendorable set, and keep `identity.ts` import-free
  (your in-flight edit does).
- **R5 status:** addressed in the working draft. As of the 16:28 IST snapshot it has no direct-write
  revokes, and its comment defers them to "a later contract migration".
- **R6 (pre-review of the unpushed `20260930050000_mandate_lifecycle.sql`, snapshot 16:28 IST, sha
  `d1ca1ce5`). Verdict so far: PASS with notes, nothing blocking.** Checked against the SQL and the
  live DB:
  - **Correct as drafted:**
    - Every new `security definer` function sets `search_path`.
    - `issue_agent`, `set_agent_status` and `decide_approval` derive the owner from `auth.uid()`.
    - Grants are restored after each drop/create (`verify_agent` keeps anon).
    - Reissue, spend and status all take `for no key update` on the agent row.
    - The monthly cap sums across versions, so a reissue cannot reset it.
    - The published app's direct writes still work.
  - **R6a, fix before pushing: the hash chain does not commit to what a reissue changed.** The
    `mandate_reissued` event `detail` is only `'Mandate v' || n || ' activated: ' || reason`
    (draft ~512–518). A version row could therefore be altered without breaking the chain. Put a
    canonical sha256 of the new version row (permissions, limits, expiry, version) into `detail`. The
    log then anchors the mandate history, which is the verifier-visible versioning this item exists
    for.
  - **R6b, cheap to add:** the append-only triggers on `agent_mandate_versions` and
    `agent_mandate_requests` are row-level `before update or delete`, so `TRUNCATE` bypasses them. Add a
    `before truncate … for each statement` trigger. Say in the comment that the database owner can
    still bypass it; AGENTS.md is honest about the same limit on the hash chain.
  - **R6c, document:** approvals with a null `mandate_version` read as `superseded` after cutover. The
    live `approval_requests` table has **0 rows**, so nothing is invalidated today. Just state it.
  - **R6d, document:** the new `on delete restrict` FKs plus the delete-blocking trigger make agents
    permanent. A reviewer suggested this breaks account deletion. **It does not:** `agents.owner_id` has
    no FK to `auth.users` (live catalog), so account deletion never cascades into `agents`. See R7.
  - **Hygiene:** add `revoke execute … from public, anon, authenticated` on the four new trigger
    functions. Use `(select auth.uid())` in the new RLS policy.
- **R7 (pre-existing, trust gap, not introduced by this work).** Deleting an owner's auth account
  cascades only `owner_attestations`. Their agents keep `status = valid` and still verify as live
  agents, now with `owner_verified = false`. That is an agent with no accountable party, the position
  AGENTS.md calls worthless. Suggested fix, consistent with R6d's permanent history: revoke (not
  delete) an owner's agents when their account is deleted, and keep the log. Candidate for the
  contract migration, or its own.
- **R5 (deploy ordering, BLOCKING as drafted). Pre-review of the unpushed
  `20260930050000_mandate_lifecycle.sql`.** The draft revokes `insert`/`update`/`delete` on
  `public.agents` from `authenticated` and drops the owner insert/update/delete policies. The code
  production runs writes `agents` directly: `agents.new.tsx:76` inserts, and `agents.$id.tsx:134`
  updates `status`, which **is the freeze switch**. `toggle()` ignores the returned error.
  - **Consequence:** from the moment Lovable applies this until the new code is published, owners
    cannot create agents, and pressing Freeze silently does nothing. Publishing needs the founder, so
    that window has no fixed length.
  - **Fix: expand, then contract.**
    - *Migration A, expand:* the new tables, functions and grants, with the existing direct-write
      grants and policies left in place. Code moves to `issue_agent`, `reissue_agent_mandate` and
      `set_agent_status`. The supervisor relays A as usual.
    - *Migration B, contract:* only the revokes and policy drops, in its own `DB MIGRATION NEEDED:`
      commit that says "apply after the A code is published". The supervisor holds B until the founder
      confirms the publish.
  - **Also:** the new freeze path must surface the RPC error to the owner, since a kill switch that
    can fail silently is the worst failure here.
  - **Already fine in the draft:** `verify_agent` is dropped, recreated and re-granted to
    anon/authenticated. Recreating `agent_allowance` with anon keeps today's live grant (no widening).
    `approval_state`, `create_approval_request` and `reserve_spend` stay service_role only, as live. There
    are 10 `security definer` functions, each with `set search_path`.
- **Heads-up for the mandate-lifecycle migration.** Your in-flight `identity.ts` reads
  `owner_attestation_expires_at`, which the live `verify_agent` does not return. Adding a column to a
  function's return type means `drop function` + `create`, which also drops its grants. The migration
  must restore `execute` for `anon` and `authenticated` (public verification depends on it), keep
  `security definer` and `set search_path`, and keep `revoke … from public` for everything else. The
  supervisor will probe exactly this after Lovable applies it.
- **Nothing blocking.** Do not move `/api/webhooks/didit`: the real sandbox delivery proves the production destination works.
- **Next work:** DIRECTION §19.9 item 2, mandate lifecycle (edit/reissue semantics, history,
  verifier-visible versioning). Item 1 is closed. Fold R3 into your next commit.
  §19.9 item 1's sandbox flow is waiting on founder items 1–3.

## Founder decisions

- 2026-09-30: The supervisor's role is admin, a review gate and strategy critique. Proposals bind Kiro
  only once approved.
- 2026-09-30: **P1 rejected.** The §19.9 build order ("basement first") stands.
- 2026-09-30: A migration that passes supervisor review goes to Lovable to apply without further
  sign-off. Publishing still needs the founder.

## Open requests

| Request | From → to | Status |
| --- | --- | --- |
| [P1: Run the external verifier test now](requests/20260930-0738-verifier-test-before-features.md) | supervisor → founder | **rejected** by the founder. §19.9 order stands |
| [Review R1, record the sandbox run](requests/20260930-0751-review-r1-record-sandbox.md) | kiro → supervisor | **needs-founder**. Review passed; only the publish and the post-publish console test remain |

## Log

- 2026-09-30 11:01 UTC: Deep pre-review of the draft mandate migration (R6: PASS with notes; R6a–d checked against SQL and live DB). Found R7, a pre-existing gap where a deleted owner's agents stay valid.
- 2026-09-30 08:57 UTC: Pre-reviewed the unpushed mandate-lifecycle migration. Added R5 (blocking as drafted): the direct-write revoke would break production freeze until the next publish. Proposed expand, then contract.
- 2026-09-30 08:27 UTC: Pre-reviewed Kiro's in-flight mandate work (not yet pushed). Added R4 and a heads-up on the `verify_agent` migration.
- 2026-09-30 08:02 UTC: Reviewed `fec4661`: PASS with notes (R3). Verified the sandbox flow live; §19.9 item 1 closed. The publish of `fec4661` is waiting on the founder.
- 2026-09-30 07:50 UTC: Founder rejected P1. Kiro's next work is R1, R2, then §19.9 item 2.
- 2026-09-30 07:38 UTC: Filed P1, the first strategy proposal. Added R2 (docs drift).
- 2026-09-30 07:35 UTC: Founder expanded the supervisor role (review gate, strategy critique, and
  applying reviewed migrations). Reviewed `91a2c1b`: PASS with notes.
- 2026-09-30 07:22 UTC: Supervisor started. First audit of the live DB, grants, production URL,
  secrets and gates on `91a2c1b`, recorded above.
