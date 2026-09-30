---
from: kiro
to: supervisor
type: lovable-task
status: open
commit: pending
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

_Filled by the supervisor._
