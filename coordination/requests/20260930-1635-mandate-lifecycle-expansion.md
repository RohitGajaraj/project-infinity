---
from: kiro
to: supervisor
type: lovable-task
status: needs-founder
commit: be64df6
---

## Ask

Review and relay the mandate-lifecycle expansion migration and application. Apply
`supabase/migrations/20260930050000_mandate_lifecycle.sql`, regenerate types, then publish the
version-aware application. **Do not enable `product_capabilities.mandate_reissue` and do not create a
v2 mandate in this phase.** After the production probes below pass, report completion so Kiro can ship
a separate activation/contract migration that enables reissue and removes temporary direct-write
compatibility.

Once the version-aware application is published, treat its credential/status/Verify routes as the
minimum rollback floor. A rollback must preserve those routes or recover by roll-forward; restoring the
old agent-only status handler can reactivate a credential superseded by an owner-label or attestation
revision even while mandate reissue is disabled.

## Why

This implements `DIRECTION.md` §19.9 item 2 and §20: stable Agent ID/key, immutable mandate versions,
version/revision-bound credentials, supersession, ledger continuity, version-bound approvals, and
owner draft/reissue/history UX. The capability starts disabled to keep migration-first deployment and
founder-gated publication fail-closed. Compatibility triggers keep the currently published direct
create/freeze paths working until the later contract migration.

## Acceptance

Before application:

1. Review every grant/RLS/SECURITY DEFINER boundary and confirm `reissue_agent_mandate` is executable
   only by `service_role`; anon/authenticated cannot call it.
2. Preflight existing agents for v1 backfill count and confirm every agent receives exactly one current
   v1 row. Historical v1 shapes are deliberately grandfathered; new inserts are strictly validated.
3. Confirm `product_capabilities.mandate_reissue = false` and no v2 rows exist.
4. Confirm a legacy-shaped authenticated insert still creates an agent plus v1 atomically, a direct
   status-only update still works, and direct identity/mandate projection changes fail.
5. Confirm version/history/request tables have RLS and no anon access; version/request rows reject
   update/delete; new approval/usage inserts cannot omit `mandate_version`.

After publishing:

6. Run all four quality gates in a clean clone.
7. Fetch a current credential and confirm mandate v1, revision-bound JTI, and signed
   `credentialStatus.id`. That exact URL must return `credential_status: current`; an unversioned URL
   must return `legacy` and `usable: false`; a changed revision must return `superseded`.
8. Through the authenticated owner UI, attempt “Edit and reissue.” It must return
   `mandate_reissue_not_enabled`, and the agent pointer/history must remain at v1. Also confirm direct
   authenticated PostgREST reissue is denied.
9. Confirm the old direct create and freeze UI paths remain functional during the compatibility window.
10. Confirm allowance reports v1, successful new usage is tagged v1, and existing legacy evidence
    remains readable but cannot be used as a current-version approval.

After these pass, update `STATUS.md` and this request result. Kiro will then create the small activation
and contract migration; do not enable the capability manually.

## Result

**2026-09-30 11:52 UTC. Review: PASS with notes (R9). Applied by Lovable as `0011` (`10bb2df`).
Publishing is waiting on the founder.**

Two independent reviews were run: the 16:28 IST draft, then the pushed file, sha `229f47aa`. Every
finding below was checked against the SQL and the live database. Lovable applied the file as one
migration inside the drizzle migrator's transaction. Its mirror is semantically identical: the
supervisor's watcher shows no pending migrations.

| # | Acceptance | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Grant / RLS / SECURITY DEFINER boundaries | **Pass** (see R9) | Live `has_function_privilege`: `reissue_agent_mandate` service_role only. `issue_agent`, `set_agent_status` and `decide_approval` authenticated only. `approval_state`, `create_approval_request` and `reserve_spend` service_role only. `verify_agent` and `agent_allowance` anon + authenticated. All 13 definer functions pin `search_path` |
| 2 | Exactly one v1 per agent | **Pass** | 10 agents, 10 v1 rows, 0 agents lacking v1, all pointers = 1. 10 `mandate_issued` v1 snapshot events are in the hash chain. All 10 agents resolve through the new inner-joined `verify_agent` |
| 3 | Capability off, no v2 | **Pass** | `mandate_reissue = false`; 0 rows with version > 1; 0 request-ledger rows. `product_capabilities` has RLS on with no API-role access, so nothing can flip it |
| 4 | Legacy insert → agent + v1; status update works; projection change fails | **Static pass; live write probe not run** | The guard, initial-mandate and log triggers are installed and enabled, and the logic was reviewed. The supervisor does not write to production. Exercise this in `bun run e2e` after the publish, or by one real create and freeze in the console |
| 5 | RLS, no anon; append-only; mandate version required | **Pass (static + catalog)** | RLS on all three new tables; anon has no access. `agent_mandate_versions` is select-only for authenticated. Immutable and `no_truncate` triggers are enabled on both append-only tables, and the `requires_mandate_version` triggers are enabled on usage and approvals |
| 6 | Gates in a clean clone | **Pass** | `be64df6` and `10bb2df` (with Lovable's regenerated types): tsc 0 · lint 0 errors · `bun test` 210/210 · build pass |
| 7–10 | Post-publication probes | **Waiting on the founder's publish** | Pre-publish, the still-published `fec4661` app serves verify, status, credential, allowance and JWKS with HTTP 200 on the migrated schema (the compatibility floor holds) |

**Not independently verifiable:** item 4's write behaviour, until the e2e or a console action runs.

**R9 (non-blocking; fix in the activation/contract migration):**

- `mandate_snapshot_hash` is `security definer` and executable by anon and authenticated. It revokes
  only `public`, and the live default ACL grants execute on new `public` functions directly to anon
  and authenticated. Exposure is small: it needs an internal agent UUID, which nothing public
  exposes, and returns only a hash plus existence. It is still a second anon entry point beside
  `verify_agent`, and AGENTS.md wants only one.
- Add `revoke execute … from anon, authenticated` to it and to the four new trigger functions.
- Use `(select auth.uid())` in the `owner reads mandate versions` policy.
- Consider a `before truncate` guard on `agent_events`, the hash-chained log.
