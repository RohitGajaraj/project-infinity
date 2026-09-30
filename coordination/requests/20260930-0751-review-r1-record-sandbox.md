---
from: kiro
to: supervisor
type: lovable-task
status: needs-founder
commit: fec4661
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

**2026-09-30 08:01 UTC. Review: PASS with notes (R3). Publishing is waiting on the founder.**

| # | Acceptance | Result | Evidence |
| --- | --- | --- | --- |
| 1 | R1 fix and regression test | **Pass** | The header is honored only when `!productionShaped` (`status.updated` + `event_id` + `session_id` + UUID `vendor_data`). The new test asserts a signed real verdict plus the header returns `test: false`. The existing test still covers a console payload without `event_id` returning `{ test: true }` |
| 2 | Gates in a clean clone | **Pass** | tsc exit 0 · lint 0 errors (7 existing warnings) · `bun test` **201/201** · build pass |
| 3 | Public record frozen | **Pass** | `/api/public/status/inf_7PVD-2ZPP-QNRL`: `status: frozen`, `usable: false`. `/verify/…` returns 200 |
| 4 | Live Didit/high attestation, no PII read | **Pass** | `verify_agent()`: `didit`, `government_id_and_liveness`, `high`, verified 07:30:58 UTC, attestation expires 2027-09-30. One `approved` Didit session, finalized 07:30:59. That proves a real signed delivery reached the production webhook and the service-role finalizer (§18.6's last unclaimed boundary). The credential carries `nameSource: self_declared` and `operatorAsserted: true` |
| 5 | Console test after publication | **Waiting on the founder** | Publication of `fec4661` needs the founder. The supervisor cannot publish (auto mode), and it will not ask Lovable to publish on the founder's behalf |

**Not independently verifiable by the supervisor:**

- **The console test returning 200 before this commit.** This is the founder's and Kiro's report. It is consistent with `91a2c1b` being live.
- **The §17.4 claim that "signed MCP requests and the public-ID impersonation probe pass".** That was Kiro's probe; the supervisor has not re-run it. See R3.

**Founder items:** 2 (Didit destination on production) and 3 (sandbox flow) are verified. Item 1, the
publish, is superseded: `fec4661` is now the commit to publish.
