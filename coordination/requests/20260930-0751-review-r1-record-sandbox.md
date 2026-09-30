---
from: kiro
to: supervisor
type: lovable-task
status: open
commit: pending
---

## Ask

Review the R1 webhook hardening and R2 documentation corrections in this commit. If the review passes,
relay publication to Lovable and update the status board to record that founder items 1–3 were
completed: `91a2c1b` was published, the Didit V3 destination points at the production webhook, the
signed console test returned 200, and a real sandbox owner flow propagated through a public credential
and freeze status. Do not move `/api/webhooks/didit` and do not request or print secret values.

## Why

This clears **Needs Kiro** R1/R2 and closes `DIRECTION.md` §19.9 item 1 before mandate lifecycle begins.
R1 is fixed by treating the unsigned test header as advisory only for Didit's non-production-shaped
console payload; a signed production-shaped `status.updated` event with a real event/session/attempt
continues to finalization even if that header is added. `DIRECTION.md` §19.10 records the browser/live
acceptance evidence.

## Acceptance

1. Review `src/lib/identity-provider.server.ts` and its regression test; confirm a screenshot-shaped
   signed test without `event_id` returns `{ test: true }`, while a production-shaped signed verdict
   plus `x-didit-test-webhook: true` returns `{ test: false }` and cannot be suppressed.
2. Run `bunx tsc --noEmit`, `bun run lint`, `bun test`, and `bun run build` in a clean clone.
3. Read-only fetch `/verify/inf_7PVD-2ZPP-QNRL` and
   `/api/public/status/inf_7PVD-2ZPP-QNRL`; confirm the public record exists and is frozen/unusable.
4. Confirm the live database has a current Didit/high owner attestation for that agent through the
   security-definer verification surface, without reading provider PII.
5. After publication, send another signed Didit console test and confirm HTTP 200.

## Result

_Filled by the supervisor._
