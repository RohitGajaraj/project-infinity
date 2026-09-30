---
from: kiro
to: supervisor
type: lovable-task
status: done
commit: 78860b1
---

## Ask

Record the completed production write probes below, review
`supabase/migrations/20260930060000_activate_mandate_lifecycle.sql`, and relay it to Lovable only if
the evidence closes request `20260930-1635` items 4, 8, 9 and 10-spend. Apply the migration
transactionally, regenerate types if Lovable reports a schema delta, and probe the contracted grants,
R9 hardening and enabled capability. Do not manually edit the capability or production tables.

## Why

This closes `DIRECTION.md` §20's expansion-then-contract rollout. The version-aware application is
published and the migration-first compatibility window has been exercised. The contract removes direct
authenticated agent mutations, keeps the RPC and immutable-history invariants, closes R9, guards the
hash-chained log against accidental TRUNCATE, and enables owner-mediated reissue only after all of
those changes are in the same transaction.

R7 is deliberately not mixed into this migration. A terminal owner-deletion revocation needs a
revoked-aware application release plus an explicit evidence-retention contract before the database can
emit that new state; the current console and MCP wording would misdescribe it as a reversible freeze.

## Production write evidence

Run on 2026-09-30 against `https://infinityalpha.lovable.app` after production published `10bb2df`:

1. `E2E_APP_ORIGIN=https://infinityalpha.lovable.app bun run e2e` returned `ALL CHECKS PASSED`.
   It issued `inf_84NZ-SN23-DCRC` atomically at mandate v1, verified its VC-JWT offline, proved key
   possession, froze/unfroze/refroze it, recorded a $10 spend, and read the resulting usage row with
   `mandate_version = 1`. It also confirmed direct authenticated reissue is denied, direct mandate
   projection/history mutation is denied, and the frozen agent is rejected by MCP. The synthetic agent
   was left frozen by design.
2. A separate old-client compatibility probe used authenticated PostgREST directly, not the new RPCs.
   Direct `POST /rest/v1/agents` returned HTTP 201 for `inf_8L4D-DF5Y-YLMY`; its v1 history existed in
   the same completed request. Direct `PATCH /rest/v1/agents` returned HTTP 200, left
   `current_mandate_version = 1`, and the public verifier reported `status = frozen`. The synthetic
   agent was left frozen.
3. In the published owner console, Kiro opened frozen sandbox agent `inf_7PVD-2ZPP-QNRL`, selected
   **Edit and reissue**, entered a valid reason, and selected **Activate mandate v2**. The UI displayed
   `Versioning is installed but not activated yet. Try again after the production status probe.` and
   continued to show only `Mandate v1` / `v1 · Active`. In source, that alert is uniquely selected when
   the server error contains `mandate_reissue_not_enabled` (`src/components/MandateLifecycle.tsx`).
   No v2 was created.

No secret values were printed or recorded. The production issuer still reports provisional mode; this
evidence does not claim issuer-key hardening.

## Acceptance

Before relaying:

1. Confirm request `20260930-1635` is now fully evidenced and no mandate version greater than v1 exists.
2. Review the migration as a contraction: authenticated keeps `SELECT` on `agents` but loses
   `INSERT`, `UPDATE` and `DELETE`; the owner insert/update/delete policies are absent; permanent
   guard, initial-version, event-log and immutable-history triggers remain enabled.
3. Confirm the migration revokes anon/authenticated execute on `mandate_snapshot_hash`, the four R9
   trigger helpers, and the new activity-log TRUNCATE guard. Confirm the optimized mandate-history
   policy remains owner-only.
4. Confirm `reissue_agent_mandate` remains service-role-only and the application remains the only owner
   entry point. `issue_agent` and `set_agent_status` remain authenticated RPCs.

After application:

5. Probe all grants, policies, trigger enablement and `product_capabilities.mandate_reissue = true` with
   a non-null `enabled_at`. Verify `agent_events_no_truncate` exists; do not actually truncate data.
6. Confirm the published console can still issue and freeze through RPCs and direct authenticated
   PostgREST insert/update now fail.
7. Report completion so Kiro can run post-activation acceptance: create one disposable v1 agent,
   reissue it to v2 through the owner application boundary, prove v1 superseded/v2 current, prove spend
   continuity and version tagging, then leave the agent frozen.

## Result

**2026-09-30 13:03 UTC. Review: PASS with notes (R10). Applied by Lovable as `0012` (`3b74a20`). `mandate_reissue`
is live.**

**Evidence gate: confirmed against live rows, not taken on report.**
- `inf_84NZ-SN23-DCRC`: v1, one version. Usage is `spend $10.00 v1`. Its events run issued → frozen →
  unfrozen → mcp_authorized… → spend → frozen.
- `inf_8L4D-DF5Y-YLMY`: created by the direct POST at 12:19 UTC with its v1 row, then frozen by the
  direct PATCH.
- Before the apply there were 0 versions above 1 and 0 reissue-ledger rows. That is consistent with the
  console reissue being refused as `mandate_reissue_not_enabled`.
- No code on `main` writes `agents` directly. Owners use `issue_agent` and `set_agent_status`.
- Request `20260930-1635` items 4, 8, 9 and the spend tagging are therefore evidenced.

**Migration review.** Read line by line.
- The table lock and preconditions come first, the flag flip comes last, and it self-asserts its
  security contract, all in one transaction.
- Revoking `EXECUTE` on the trigger functions is safe. After the contract, every write to these tables
  runs inside a `security definer` function, so the triggers fire as the owning role.
- Gates on `78860b1`: tsc 0 · lint 0 errors · `bun test` 210/210 · build pass.

**Live probes after the apply**

| Check | Result |
| --- | --- |
| Migrations | 13 applied. The `0012` mirror is semantically identical (watcher: no pending) |
| Capability | `mandate_reissue = true`, `enabled_at` 13:01 UTC |
| `agents` for authenticated | select only (insert, update and delete all false). Only policy: `owner read agents (SELECT)` |
| History RLS | `owner reads mandate versions` uses `(select auth.uid())` |
| R9 | 0 of the 6 internal functions are executable by anon or authenticated |
| Public RPCs | `verify_agent` and `agent_allowance` are still anon-callable. `issue_agent`, `set_agent_status` and `decide_approval` are authenticated-only |
| Log | `agent_events_no_truncate` is enabled |
| Default ACL | the `postgres` role's function defaults now grant only postgres and service_role. `supabase_admin`'s defaults are unchanged |
| Production | verify, status, allowance, JWKS and issuer metadata return 200. A valid agent's signed status reads `current`, `usable: true` |
| Reissues so far | 0 (no version above 1) |

**R10 (informational).** Because of the default-privilege change, a new `public` function needs an
explicit grant to be callable by the API roles. That includes helpers used inside RLS policies. It has
been added to Lovable's project knowledge, and Kiro's migrations already grant explicitly.
