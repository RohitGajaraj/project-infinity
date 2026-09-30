---
from: supervisor
to: founder
type: proposal
status: rejected
commit: 4c7543b
---

# P1: Run the external verifier test now. It needs no more code.

## Ask

Move the external handshake milestone (DIRECTION §19.9, item 5) to item 2, ahead of mandate
lifecycle, key rotation and approval receipts. While the founder runs it, Kiro builds only what
lowers the cost of verifier adoption.

## Why

**The repo's own rule says so, and the build has drifted past it.**

- §10.7 sets the phase-1 done test: *"one business completes the full handshake … against an agent it
  does not own, in under a second, in its own codebase."*
- §15.5: *"That is the next real milestone, and no further feature work should precede it."*
- §16.3: *"Everything after that is a guess until a real verifier has completed the handshake."*
- §17.5: *"Phase 1 is still not commercially validated until one unrelated business completes
  credential, challenge, proof, and status."*
- Since §15.5, §17–§19 shipped signed MCP authorization and the Didit owner flow, and §19.9 now places
  the milestone fifth.

**The milestone is blocked by outreach, not by code.** §10.7 step 2 asks for *"a drop-in verifier:
one function, one file, no account, no key"*. It exists: `src/lib/verifier.ts`, headed *"The drop-in
verifier. This is the file a business copies."*

**No external evidence exists yet.** No section records a conversation with any verifier, customer or
design partner. The plan's own risk tests assume those conversations happen:

- §10.8: *"Watch which framing the first five conversations respond to."*
- §19.8: *"five real verifier conversations establish a materially different assurance requirement."*

The last project died the same way. §1 records *"0 of 25 outreach messages sent."*

**Items 2–4 are exactly what a verifier would have opinions on.** Mandate versioning, rotation
semantics and receipt format are the parts of the credential a verifier pins to. If they are designed
before any verifier has seen them, they may be designed twice.

## The strongest argument against this, and why it does not hold

*"Change the credential format after verifiers integrate and you break them, so finish the lifecycle
first."* That is true at scale. But the first test is one business, for a single afternoon (§10.7).
Changing a format with one design partner is cheap, and that partner's feedback is the input the
versioning design needs. Founder direction in §18–§19 ("basement first") is also not contradicted:
this proposal adds no connectors (§19.5's anti-wrapper test). It moves validation, not integrations.

## If approved

**Kiro, until the first verifier reports back** (all verifier-side; nothing new on the owner side):

1. **One-file verifier.** A single bundled file combining `verifier.ts`, `credential.ts`, `jws.ts`
   and `pop.ts`, generated from source with a test that it matches. §10.8's mitigation is *"free and
   one file"*, and today it is four.
2. **A 10-minute quickstart** for an API operator: credential, challenge, proof and status, with
   copy-paste code.
3. **A public test agent** anyone can verify against, plus a timing harness that proves or disproves
   "under a second" against production.
4. **R1 and the doc drift R2** from `STATUS.md`.

**Founder:**

1. **Five conversations** with operators "already receiving agent traffic that [they] cannot
   classify" (§10.7). Record in DIRECTION.md whether each responds to *block* or *verify* (§10.8).
2. **Run or formally kill the hang-up test** (§13.7 step 2: *"No product required"*). It was never
   run or retired.
3. **Before starting, lock the kill/continue criteria,** as §5 did. Suggested defaults:
   - At least 1 of 5 completes the handshake in its own codebase: continue with §19.9 as reordered.
   - 0 of 5 willing to try within two weeks: reopen §10's customer model before building items 2–4.

**Unchanged:** the trust claims, Didit, the security review gate, and one thing at a time.

## Acceptance

The founder approves, amends or rejects this in chat. On approval, the supervisor sets `status:
approved`, and Kiro amends DIRECTION §19.9 to match in its next commit.

## Result

**Rejected by the founder, 2026-09-30 07:50 UTC.** DIRECTION §19.9 order stands: basement first, as decided in
§18–§19. Kiro takes no action from this proposal. The supervisor will not re-propose this reordering
unless new external evidence appears, such as a verifier conversation.
