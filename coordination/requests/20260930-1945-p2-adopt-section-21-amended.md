---
from: supervisor
to: founder
type: proposal
status: proposed
commit: 46adc74
---

# P2: Adopt DIRECTION §21 with five amendments

## Ask

Approve §21's recommendation, with the five amendments below:

- **Reject** building a Muse/Instinct/Dots/Wajo-style agent.
- **Keep** the credential and mandate as primitives.
- **Test** a narrow, enforced Agent Accountability Runtime.

This answers Kiro's request `20260930-1904-strategy-decision`. On approval, Kiro folds the amendments
into §21 and marks it binding.

## Verdict on §21: the recommendation survives

**The market evidence holds.** The supervisor had every external claim checked against its primary
source on 2026-09-30:

- **10 of 13 confirmed, 3 partial, none contradicted.** Confirmed: Muse, Instinct, Dots, DigiCert
  passports and enforcement points, Proof x401, Okta, NewCore, Visa TAP, AP2, UCP profiles and Web Bot
  Auth.
- **The partials** need two wording fixes; see Corrections.
- **Visa TAP** says it is *"in the process of development and deployment."*
- **x401** is `v0.1.0`, "Active development", with **no named adopters**: *"Formal announcements are
  coming."* Its 8,000+ figure is Proof's wider identity network, not x401 acceptance.

**The competitive boundary is real but narrow.**

| Product | What it covers of the owned layer |
| --- | --- |
| Proof x401 | Independent issuer, IAL2-verified human delegator, signed scope, action-bound presentation |
| DigiCert | Passports and policy enforcement points |
| Okta | In-enterprise deactivation |
| Visa TAP | Per-request signatures, on Visa's rail only |
| Web Bot Auth | Key possession for registered bots |

On the sources read, **none offers an exact current delegation version plus a live revocation signal
usable across rails**. Infinity already runs both in production: migrations `0011`/`0012`, and
`credentialStatus` returning current, legacy or superseded. That is the defensible piece. A feature
missing from a product page is not proof of absence, so Gate A must ask about it directly.

**The option analysis is sound.** Option A is correctly rejected. Option B correctly warns that a
passport alone is a badge. Option C's "infrastructure only when an action passes through an enforced
boundary" is the right bar.

## Five amendments

1. **Split Gate A into A1 and A2, because 7 days measures sales cycles, not demand.** §21.10 requires
   a priced pilot with a deposit *and* a recipient's written enforcement commitment within 7 days,
   starting from **zero recorded conversations**: DIRECTION.md records none with any verifier, customer or design partner (see P1). Real B2B pain
   rarely closes that fast, and a miss would read as "no demand".
   - **A1 (7 days, leading indicators).**
     - At least 10 operators and 10 recipients are contacted.
     - At least 6 qualified conversations are held.
     - At least 3 operators put a number on a recurring blocked, fallback or dispute cost.
     - At least 1 recipient agrees to a technical scoping call.
     - Failing A1 stops commerce.
   - **A2 (up to 30 more days, commitments).** §21.10's criteria, unchanged: deposit, a price of at
     least 10% of the monthly cost with a $500 floor, a written recipient commitment, and a
     why-not-Proof/DigiCert explanation from both parties.
2. **Replace Gate C's "operator proves traffic cannot bypass the signer" with key custody plus
   recipient enforcement.** On the pilot route the recipient *is* the control: it rejects unsigned,
   forged, frozen, superseded and out-of-scope requests, so bypassing the signer only produces denials.
   The security claim for the route needs only this: **the agent key is non-exportable from the
   signer or KMS, and the recipient enforces.** Egress control matters only for claims beyond the
   route, and demanding it of a first pilot could stall every pilot without adding route security.
3. **A Gate A failure goes to the founder, not automatically to voice.** You parked voice in §14, and
   the §13.7 hang-up test was never run or retired. Decide now whether voice remains the fallback. If
   it does, run or retire that test so the fallback is real.
4. **Take the issuer key out of Gate B and do it now.** Run `bun run keygen`, then put the result in
   `INFINITY_ISSUER_JWK` in Lovable's secret store. It takes about 5 minutes. Production signs
   provisionally today, and no pilot may rely on that.
5. **Treat Proof x401 as a complement first, not only as a threat.** x401 lacks key binding,
   versioning and revocation on its public page, and Infinity has all three. "x401 principal
   credential + Infinity agent key, current version and live revocation" is a plausible combined
   offer, consistent with §21.4's "reference, don't replace" and with the Didit precedent. Gate A's
   script should ask recipients whether x401 alone would do, and whether the combination would.

## Corrections to §21

- **§21.3:** Wajo *markets* outcomes but *prices* by task-count tiers ("Includes 1000 tasks per day").
- **§21.6:** the NIST NCCoE item is still a **concept paper** for a *potential* project, not a running
  project.

## Answers to Kiro's five questions

1. **Distinct or partner?** Distinct enough to test, but the narrow difference (current version +
   cross-rail revocation) must be confirmed in interviews. Lead with the x401-complement framing
   (amendment 5).
2. **Seven-day recruitment-only test alongside the key work?** Yes, as A1 and A2 (amendment 1). **This
   is not P1 again.** You rejected P1 because it *reordered* the build. This changes no build order,
   since §19.9 item 3 (key rotation and recovery) continues. Its real cost is **your time**. Gate A
   needs about 20 human contacts, and neither Kiro nor the supervisor can make them. Kiro can prepare
   the target list, the interview script and the tracking sheet, which counts as no product code.
3. **Authorize one route before a generalized receipt or adapter build?** Yes. One route, one signer,
   one verifier, and nothing generalized until a pilot pays.
4. **Is the accountable-side revenue rule still binding?** Yes. Recording verifier-side payment as
   evidence to revisit §10, rather than as a pass, is correct.
5. **Hosted assistants as partners, self-serve only for customer-controlled runtimes?** Yes. It
   matches AGENTS.md's rule that claims must be backed by code: advertise no one-command compatibility
   that Muse, Instinct, Dots or Wajo do not permit.

## Acceptance

The founder approves, amends or rejects this in chat. On approval, the supervisor sets
`status: approved` and records it in `STATUS.md`. Kiro then folds the amendments and corrections into
§21, marks it binding, and drafts the Gate A materials: the target list, the interview script
(including the x401 question) and the tracking sheet.

## Result

_Awaiting the founder._
