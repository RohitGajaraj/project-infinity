# Status board

Maintained by the supervisor. Kiro: read this before every task and do not edit it. Protocol is in
[`README.md`](README.md).

**Updated:** 2026-09-30 12:34 UTC · **`main` at:** `fc3ae64` · **Production:** `10bb2df`, published (mandate v1 live)

## Live system, verified by probe

| Check | Result | Evidence |
| --- | --- | --- |
| Migrations applied | 12/12. `0000` is Lovable's baseline; `0001`–`0011` mirror all 11 files in `supabase/migrations/`. `0011` is the mandate lifecycle, applied 2026-09-30 | `drizzle.__drizzle_migrations` hashes match `drizzle/migrations/*.sql` |
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
| **Mandate lifecycle (`0011`)** | 10/10 agents on v1, each with a v1 snapshot event in the hash chain. `mandate_reissue = false`; no v2. `reissue_agent_mandate` is service_role only; the new tables have RLS on with no anon access. The published `fec4661` app still serves verify, status, credential, allowance and JWKS with HTTP 200 | Live catalog + public endpoints; request `20260930-1635` |
| Quality gates on `10bb2df` | tsc pass · lint 0 errors · `bun test` 210/210 · build pass (includes Lovable's regenerated types) | Supervisor's clean clone |
| Quality gates on `fec4661` | tsc pass · lint 0 errors (7 existing warnings) · `bun test` 201/201 · build pass | Supervisor's clean clone |

## Blocked on the founder

1. **Published: done.** Production serves mandate v1 (verified). Two quick checks remain:
   - Send one signed Didit console test and expect HTTP 200. That confirms R1 on production.
   - Press Freeze and then Unfreeze once on a test agent. That checks the new `set_agent_status` path
     and its error surfacing.
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
| `be64df6` | Mandate lifecycle expansion (migration + app) | **PASS with notes** | Two reviews (draft and pushed), verified against the SQL and live DB. Applied as `0011`. R5, R6a, R6b, R3 and R4 closed. Note R9 below |
| `fec4661` | R1 webhook hardening, R2 docs, §19.10 | **PASS with notes** | R1 closed: the test header is honored only for non-production-shaped bodies, and the regression test covers the replay. R2 closed. Note R3 below |
| `91a2c1b` | Didit test-webhook acceptance (`identity-provider.server.ts`) | **PASS with notes** | Freshness (±300 s, header = body timestamp) and HMAC run before the test branch. `{test: true}` returns 200 at the route and cannot reach `finalize_owner_identity_session`. Safe to publish. Note R1 below |

## Needs Kiro

- **R9 (hygiene, low, non-blocking; fold into the activation/contract migration).**
  - `mandate_snapshot_hash` is `security definer` and anon-executable. It revokes only `public`, and
    the live default ACL grants new `public` functions to anon and authenticated.
  - Revoke `execute` from anon and authenticated on it and on the four new trigger functions.
  - Use `(select auth.uid())` in `owner reads mandate versions`.
  - Consider a `before truncate` guard on `agent_events`.
- **R7 (pre-existing trust gap, still open):** a deleted owner's agents stay `valid`. Revoke them, but
  keep the history.
- **Closed:** R1 and R2 (`fec4661`); R3, R4, R5, R6a and R6b (`be64df6`).
- **Next work:**
  1. Run `bun run e2e` against production to cover the write-side checks the supervisor cannot run
     (request `20260930-1635` items 4, 8 and 9, plus spend tagging), and file the results as a
     request.
  2. Then ship the activation/contract migration: enable reissue, drop the direct-write compatibility, fold in R9, and
  consider R7. Give it the same review, then apply, then publish.
- **Standing:** do not move `/api/webhooks/didit`. The real sandbox delivery proves the production destination works.

## Founder decisions

- 2026-09-30: The supervisor's role is admin, a review gate and strategy critique. Proposals bind Kiro
  only once approved.
- 2026-09-30: **Feature activation by migration follows the same rule.** A migration that flips a
  `product_capabilities` flag (for example, `mandate_reissue`) is applied once supervisor review
  passes, with no separate founder go. Publishing code still needs the founder.
- 2026-09-30: **P1 rejected.** The §19.9 build order ("basement first") stands.
- 2026-09-30: A migration that passes supervisor review goes to Lovable to apply without further
  sign-off. Publishing still needs the founder.

## Open requests

| Request | From → to | Status |
| --- | --- | --- |
| [P1: Run the external verifier test now](requests/20260930-0738-verifier-test-before-features.md) | supervisor → founder | **rejected** by the founder. §19.9 order stands |
| [Review R1, record the sandbox run](requests/20260930-0751-review-r1-record-sandbox.md) | kiro → supervisor | **needs-founder**: publish, then the console test |
| [Mandate lifecycle expansion](requests/20260930-1635-mandate-lifecycle-expansion.md) | kiro → supervisor | **done**. Applied, published, and read-probed live. The write-side checks go to Kiro's e2e |

## Log

- 2026-09-30 12:34 UTC: Founder decided that activation migrations apply after review, like any migration.
- 2026-09-30 11:59 UTC: The founder published `10bb2df`. Post-publish read probes pass: credential/status versioning current, legacy and superseded, fail-closed, and allowance on v1.
- 2026-09-30 11:52 UTC: `be64df6` reviewed (PASS with notes, R9). Lovable applied it as `0011`, verified live. Gates pass on `10bb2df`. Waiting on the founder to publish `main`.
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
