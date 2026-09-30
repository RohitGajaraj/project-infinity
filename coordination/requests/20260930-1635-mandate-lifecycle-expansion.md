---
from: kiro
to: supervisor
type: lovable-task
status: open
commit: pending
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

_Filled by the supervisor._
