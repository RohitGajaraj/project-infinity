---
from: kiro
to: supervisor
type: lovable-task
status: open
commit: pending
---

## Ask

Review and relay the agent-key lifecycle expansion:
`supabase/migrations/20260930070000_agent_key_lifecycle.sql` plus the key-aware application. Apply it
only after review, regenerate the generated Supabase types, then publish the key-aware application.
Keep `agent_key_rotation` and `agent_key_recovery` disabled; do not create a v2 key in this phase.
The separate activation/contract migration is not included here.

The founder authorized Option C and chose safe key lifecycle before the signer. This request is the
implementation of DIRECTION §22 and §19.9 item 3. The signer/sidecar follows only after the key-aware
contract is live.

## Why

The current one-time `infsk_` handoff has one immutable `agents.public_key`, no recovery and no safe
rotation. This expansion adds independent append-only key versions, fingerprint identity, routine
old-key continuity plus new-key possession, owner recovery with recent strong authentication and a
durable recovery hold, key-version-bound credentials/status/MCP/approval/spend evidence, and a v3
activity-chain format that commits authorship/provenance fields for future events.

The expansion keeps current production compatibility while both capabilities are false. Existing v1
keys are backfilled exactly once. Legacy mandate-era approval/usage/challenge/event rows are attributed
to key v1 because the key was immutable before this migration; future legacy writes receive key v1 by
compatibility triggers. Once activation occurs, null/new unversioned provenance is rejected and old
legacy RPCs are revoked in a separate migration.

## Acceptance

### Before application

1. Review the migration as expansion-only. Confirm `current_key_version = 1`, exactly one key v1 per
   agent, `agents.public_key` equals the pointed key, no duplicate canonical fingerprints, no v2 rows,
   and both capabilities are false with null `enabled_at`.
2. Confirm `agent_key_versions` and requests have RLS, owner-scoped key-history SELECT only, no anon
   access, and UPDATE/DELETE/TRUNCATE guards. Confirm helper/trigger functions and all key-change RPCs
   have explicit API-role revokes; only the service role can execute privileged key changes/v2 spend,
   approval, signed-action and recovery-confirmation functions.
3. Confirm `verify_agent` remains anon/authenticated callable, pinned SECURITY DEFINER, preserves old
   columns and appends key metadata; public credentials/status include key version/fingerprint and
   old key-v1 status URLs remain compatible while current key v1 is active.
4. Confirm existing issue/status/mandate and legacy signed-action/approval/spend paths still work while
   key capabilities are disabled, with compatibility triggers filling key v1 provenance.
5. Confirm the event-chain v3 trigger runs after key-evidence normalization, commits signer/signature/
   nonce/key version/signature scheme/signed-material digest for new rows, and agent_events rejects
   UPDATE/DELETE/TRUNCATE. Existing hashes must not be rewritten.

### After publish, before activation

6. Run clean clone gates with regenerated types: `bunx tsc --noEmit`, `bun run lint` (0 errors), `bun test`,
   `bun run build`.
7. Read-probe credential/status/Verify/MCP: current v1 credential contains `m1/k1/revision`, exact
   status is current; malformed/legacy status fails closed; key metadata discloses method/continuity;
   public and machine docs use key-aware status URLs; recovery hold is visible and unusable.
8. Run live write probes on disposable agents: direct authenticated `change_agent_key` is denied;
   app-mediated rotate/recover attempts return the disabled-capability error with no v2/no history
   mutation; authenticated direct table key mutation remains denied; old key v1 credential/proof
   remains historical and current while no key v2 exists.
9. Verify old v1 approval/usage records are consistent across owner decision, approval state, spend
   and UI; a key-v1 row is usable while disabled, and becomes superseded after future activation.
10. Exercise the recovery endpoint contract statically/live with a disposable held agent after an
    activation test fixture: invalid oversized/malformed bodies fail, POST is bound into the proof,
    CORS preflight is complete, current-key proof clears only the hold, the agent remains frozen, and
    separate owner unfreeze succeeds.
11. Confirm no response, event, request row, generated type or log contains `infsk_` or PKCS#8 material.

After these are verified, Kiro will prepare the separate activation migration that enables key rotation/
recovery, revokes the legacy no-key-version paths, requires key provenance, and preserves the recovery
hold on every unfreeze path. Do not manually enable either capability.

## Result

_Filled by the supervisor._
