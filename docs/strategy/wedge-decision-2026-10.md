# Project Infinity: Decision Doc

**Date:** 2026-10-05
**Author:** advisor review (read-only pass over `/home/user/project-infinity` and `/home/user/supaprod`)
**Labels:** [fact] needs a source and a date. [inference] is reasoning from facts. [unverified] means I could not confirm it. Prior-research claims cite the repo document they came from.
**Research limits today:** the egress proxy blocked infinityalpha.lovable.app, vanta.com, drata.com, composio.dev, pushary.com and some github.com pages. Many web facts below come from dated search snippets of the cited pages, which I could not open. Where it matters, the label says so.
**Verification pass (2026-10-05):** the review pass ran out of budget before it could re-fetch any external URL, so no URL in this document was re-opened after drafting. These repo references were re-checked against HEAD 22c412d (2026-10-01 20:22 IST) and match: `src/lib/pop.ts:15` (`INFINITY-POP-v1`), `src/routes/index.tsx:41` (Insurance row), `AGENTS.md:62` (RFC 9421 line), `DIRECTION.md:2221` (Gate A deferral), DIRECTION.md at 2,396 lines, 13 migration files, the key-lifecycle migration at 1,577 lines, `jws.ts` at 309 lines and `verifier.ts` at 230 lines.

**Correction note (2026-10-05, supervisor):** 2026-10-16 appears throughout as the lab-track decision date. That date is a proposal from this review; it does not exist in either repo or in any prior decision, so Rohit sets the real date. The final critic pass stopped on a session cost limit, so external URLs were not re-fetched after drafting. Three load-bearing sources were re-confirmed directly on 2026-10-05: Baselayer's $35M Series A (https://fintech.global/2026/09/23/baselayer-lands-35m-to-verify-ai-agents-before-fraud-hits/), Signet (https://github.com/prismer-ai/signet) and HOL Guard (https://pypi.org/pypi/hol-guard/json). Treat every other web citation as unverified until checked.
**Migration hold:** do not apply `supabase/migrations/20260930070000_agent_key_lifecycle.sql` (commit 22c412d). It serves a product with no users and is unreviewed.


## Founder decision, 2026-10-05

**Rohit closed Project Infinity on 2026-10-05 and decided not to build Supaprod either.** He made the call after reading this review. The repository stays as a record, and no further product work, migrations or publishes are planned. The five-day auditor and underwriter check in §10 is optional and not scheduled; it remains here only as the cheapest way to reopen the question if new evidence appears. The key-lifecycle migration stays unapplied. The decision gives the job hunt full priority.

---

## The answer

**KILL Infinity as built. Do not write product code. Spend five working days asking auditors and AI underwriters one question. If none of them answers it in writing by 2026-10-10, archive Infinity that day and put the lab track first.**

In 11 days Infinity reached about 18–26k lines (the count depends on the method), 12 live migrations, 210 verified tests and zero external users. Four funded parties already ship every piece of its credential: Shopify, Mastercard, FIDO and DigiCert. The runner-up wedge the panel liked, cross-vendor agent control plus a signed record of what was authorised against what was done, is also already free:
- HOL Guard handles approvals. It is Apache-2.0 and covers 16 harnesses.
- Signet produces Ed25519-signed, hash-chained receipts with delegation chains for Claude Code and Codex.
- halo-record produces witnessed chains.
- The Claude Compliance API exports Claude Code sessions to Enterprise customers.
- Drata and Vanta are moving into the auditor's evidence channel.

The only part nobody ships is a named third party's acceptance of a specific record. That acceptance comes from a relationship, and code cannot create it. The question for the five days: will an auditor, underwriter or enterprise security reviewer reject vendor logs and free open-source records, and name a record it would accept? If the answer is yes, run a deposit test with 15 deployers who have already seen the free tools. If the answer is no, archive Infinity, publish a post-mortem once you approve it, and decide on the lab track on 2026-10-16. The habit to break is the one that sank Supaprod: building in place of finding out.

---

## 1. Repo summary

### 1.1 Infinity in 10 lines

| # | Line | Label and source |
|---|---|---|
| 1 | **What:** a neutral "accountability and authorization certificate authority" for AI agents. It issues a VC-JWT that binds an agent's Ed25519 key, an owner attestation Infinity asserts itself, a versioned mandate (caps, approval threshold, expiry) and a live status URL. Anyone can verify it offline for free. | [fact] README.md L21–28; DIRECTION.md §19.4, 2026-09-30 |
| 2 | **Target product:** "Option C", a horizontal Agent Accountability Runtime with three parts (signer/sidecar, control plane, free verifier edge). The one enforced wedge it needs has never been chosen. | [fact] DIRECTION.md §21.5, §21.14, 2026-09-30 |
| 3 | **For whom:** whoever is accountable for the agent pays, and verifiers never pay. The assumed first buyer is a mid-sized action-agent operator. No buyer and no verifier is named. | [fact] DIRECTION.md §10.2 (binding), §21.8 |
| 4 | **Live as of 2026-09-30:** JWKS and issuer discovery, in-browser Verify page, proof of possession with single-use nonces, hash-chained log, `/mcp` with signed mutations, spend-cap ledger, Didit owner flow (sandbox only), immutable mandate versions. The issuer still runs in `key_mode: provisional`. | [fact] coordination/STATUS.md, 2026-09-30 14:16 UTC. I could not re-probe today (proxy 403). |
| 5 | **Pending:** the key-lifecycle migration `20260930070000_agent_key_lifecycle.sql` (1,577 SQL lines) is on main but unreviewed and unapplied. R7 is still open: a deleted owner's agents stay valid. | [fact] commit 22c412d, 2026-10-01 20:22 IST; line count re-checked 2026-10-05; request 20261001-2010 still open |
| 6 | **Size:** 25,960 non-generated ts/tsx/sql/css/js lines (21,357 hand-written excluding UI kit and generated code; 17,959 in src ts/tsx). 217 static test cases, 210/210 last verified, 229 claimed by 22c412d. 13 migration files, 12 live. DIRECTION.md is 2,396 lines. | [fact] measured 2026-10-05 at HEAD 22c412d. The brief's "~23k" sits inside this range. |
| 7 | **Customers:** zero. No external user, conversation, LOI, deposit, payment or outreach sent. All 10 production agents are test or synthetic. | [fact] all 18 .md files and commit bodies read 2026-10-05 |
| 8 | **Process:** Kiro builds, a Claude Code supervisor reviews and probes, Lovable applies and publishes, the founder decides. No step in the loop contacts a customer. | [fact] coordination/README.md, AGENTS.md |
| 9 | **Pattern:** at least seven customer-evidence gates were written. Each one was superseded, rejected or deferred. The thesis changed six times in 11 days. | [fact] DIRECTION.md §5, §10.7, §13.7, §15.5, §16.3, §17.5, §21.10/§21.14 |
| 10 | **Honest read:** the repo's own verdict on Supaprod, "building substituted for finding out" (README.md L72–73), describes Infinity's 11 days. | [inference] |

### 1.2 What is built

| Module | Does | Maturity | Label |
|---|---|---|---|
| `src/lib/jws.ts` | Zero-dependency Ed25519 compact JWS, RFC 7638 thumbprint | 309 lines; exercised by 78 tests, including `alg:none`, wrong-key and tamper cases | [fact] repo |
| `credential.ts` + `credential-status.ts` | VC-JWT build/verify; status current/superseded/expired | 326 lines, 45 tests. Live, signed with a provisional key. No external verifier has used it. | [fact] repo, STATUS.md 2026-09-30 |
| `pop.ts` | Proof of possession over nonce, method, URL and body hash | Works. Uses a custom `INFINITY-POP-v1` string (pop.ts:15) and contains no RFC 9421, Web Bot Auth or DPoP code. | [fact] grep 2026-10-05 |
| `verifier.ts` | Drop-in verifier: nonce, signature, possession, status | 230 lines, 22 tests. Not packaged. Defaults the issuer to `https://infinity.id`. | [fact] repo |
| Mandates (app + migrations 0011/0012) | Caps, approvals, immutable versions, atomic ledger | Live since 2026-09-30 13:01 UTC. Enforcement is cooperative: the agent has to call `record_spend` itself, and there is no owner notification channel. | [fact] repo, STATUS.md |
| `agent_events` chain + signed actions | Hash-chained log; agent-signed entries written through service_role | Live. One anon-callable bypass was found and fixed. Chaining is not signing, and the chain has no external anchor. | [fact] AGENTS.md |
| Owner identity / Didit | Attestation with `operatorAsserted:true`, webhook, PII stripping | One sandbox attestation. No live Didit application. | [fact] STATUS.md, README runbook |
| MCP server (7 tools) | Request-bound signed mutations | 1,154 lines, 55 tests. Stock Claude Code or Codex cannot call the protected tools without a custom signer. | [fact] DIRECTION.md §21.2; [inference] on real usage |
| Key lifecycle | Rotation and recovery with continuity proofs | Not applied, not reviewed. 1,058 app lines plus 1,577 SQL. Written the day after Gate A was deferred. | [fact] commit 22c412d |
| Landing page | Waitlist and phase table | `src/routes/index.tsx:41` lists "Insurance: Covered when an agent gets it wrong" as a Phase 5 roadmap row. No code for it exists. Signup count unknown. | [fact] repo, re-checked 2026-10-05 |

### 1.3 Every assumption, with evidence status

Status values: **Y** = evidenced, **P** = partial, **N** = no evidence. All rows come from DIRECTION.md, README.md, AGENTS.md or coordination files, read 2026-10-05.

| # | Area | Assumption (where) | Status | Evidence / note |
|---|---|---|---|---|
| A1 | Market | Agent operators feel payable pain because their agents get blocked (§10.1, §11.1) | P | [fact] Amazon blocked Muse for not identifying itself (https://www.techspot.com/news/113981-amazon-blocked-meta-muse-agentic-ai-shopping-service.html, 2026-09). No operator has been shown to pay a third party. |
| A2 | Market | Shopify-class merchants block only on trust grounds a credential can fix (§11.2) | P | [fact] Shopify gates agents through its own Web Bot Auth key registry and through partnerships (https://www.searchenginejournal.com/shopify-extends-webmcp-into-checkout-for-browser-agents/591478/, 2026-09-28). No merchant conversation. |
| A3 | Market | Businesses will verify agents instead of blocking them (§10.8, flagged by the repo as a risk) | N | Zero conversations. |
| A4 | Market | Verifier density can be reached (§10.8, §12.3) | N | Infinity has 0 verifiers. Baselayer starts with 2,000+ FIs (vendor-reported). |
| A5 | Market | Disclosure laws create demand (§12.5) | P | [fact] EU AI Act Art. 50(1) applies from 2026-08-02 (https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force). The step from "disclose" to "pay a neutral party" is [inference]. |
| A6 | Market | Disclosed, checkable agents get hung up on less (§13.4) | N | The test needs no product and has never been run. |
| A7 | Market | The commerce liability/recourse layer is unsolved (§14.3) | N | [fact] Amex already covers registered agents (https://www.emarketer.com/content/american-express-agentic-commerce-developer-tools-purchase-protection, 2026-04). |
| A8 | Market | Consumers will pay for caps, kill switch and receipts (§10.6) | N | One Wired review is the only evidence. Dots, Cloudflare Wallets and Stripe Issuing already ship controls. |
| A9 | Size | Trust layer SAM floor of $492M; ~$2B at 1% of agentic spend (MARKETPLACE-REVIEW §5) | P | Built on vendor forecasts. The repo itself labels it [ASSUMPTION]. |
| A10 | Customer | Accountable party pays, agent platforms first (§10.2) | N | §21.8: "'per active agent' is a hypothesis, not evidence." |
| A11 | Customer | Platforms buy fast because they are rebuilding the plumbing themselves (§10.2) | N | Rests on an uncited Wajo claim. |
| A12 | Buyer | First buyer is a mid-sized action-agent operator (§21.8) | N | None named or contacted. |
| A13 | Buyer | First verifier is a site that receives agent traffic it cannot classify (§10.7) | P | Bot statistics are vendor-reported (DataDome, 2026-09-22). No verifier named. |
| A14 | Buyer | Meta's paid human callers are a budget line Infinity can sell into (§11.1, §13.3) | P | [fact] It was an internal test that Meta rolled back (https://www.cp24.com/news/world/2026/09/22/meta-testing-a-human-concierge-for-its-new-personal-ai-agent-muse-reuters-exclusive/, 2026-09-22). |
| A15 | Buyer | Verifiers and insurers want a KYC'd owner on the credential (§11.4, §15.2) | P | KYA vendors launched on this premise. No verifier has said it. |
| A16 | Buyer | Recipients value an exact delegation version plus live revocation (§21.4) | N | P2: "must be confirmed in interviews." |
| A17 | Pricing | Verification is free forever (§10.1, AGENTS.md) | N | Argued by analogy and coded into the rules before anyone paid. |
| A18 | Pricing | Pilot priced at ≥10% of monthly problem cost, $500 floor (§21.10) | N | Gate A deferred. |
| A19 | Pricing | Insurance reserve and per-rail revenue (§8.4, README phases) | N | §21.11 stops these. The README still advertises them. |
| A20 | Pricing | Owner check costs ~$0.30 (§11.5) | P | No source given for the price. |
| A21 | Competition | Neutrality is the moat (§8.2) | N | §21.4 partly retracts this itself. |
| A22 | Competition | Baselayer sells a check and will not own a rail (§12.3, §13) | P | [fact] Baselayer issues W3C VCs binding agent to platform and business (https://fintech.global/2026/09/23/baselayer-lands-35m-to-verify-ai-agents-before-fraud-hits/, 2026-09-23). The distinction is gone. |
| A23 | Competition | AliasKit is no threat (§12.2) | P | Not re-verified. |
| A24 | Competition | Networks and Cloudflare will not extend into owner, mandate and receipt (§14.3) | N | [fact] Mastercard Verifiable Intent (2026-03-05), Amex protection, Cloudflare Wallets (2026-08-04) already have. |
| A25 | Competition | Nobody offers delegation version plus cross-rail revocation (P2) | P | 10 of 13 product claims confirmed (P2, 2026-09-30). |
| A26 | Competition | UCP profiles will reference a third-party credential (§11.3, AGENTS.md) | N | §21.6 concedes the bilateral cost. No UCP profile code exists. |
| A27 | Competition | A cross-company track record compounds into a moat (§10.5) | N | Zero external actions recorded. |
| A28 | Tech | The handshake rides RFC 9421 / Web Bot Auth (AGENTS.md:62) | N | [fact] No such code. `INFINITY-POP-v1` (pop.ts:15). |
| A29 | Tech | Full handshake completes in under 1s (§10.4) | N | No timing harness. P1, which proposed one, was rejected. |
| A30 | Tech | Lovable Cloud schema is exportable (AGENTS.md) | P | Works live. Export never exercised. |
| A31 | Tech | Provisional key is acceptable until real users arrive | P | Reported honestly in metadata. The key was never installed. |
| A32 | Tech | Key lifecycle must come before the signer (§22.1) | P | Sound reasoning. It delays the first external component. |
| A33 | Tech | No basement work is wasted (§12.6) | N | §21.12: "The code is not the moat." |
| A34 | Distribution | A one-file verifier lowers adoption cost (§10.7) | N | It is four files, and no external developer has used it. |
| A35 | Distribution | Agents find Infinity via llms.txt, OpenAPI and MCP (§15.4) | N | No usage data. |
| A36 | Distribution | The landing-page waitlist is the market-contact surface (§17.3) | N | Signup count unknown. |
| A37 | Founder | Capital and hires will come; not a solo company for long (§13) | N | No fundraising activity recorded. |
| A38 | Founder | Only the founder can make human contact (MARKETPLACE-REVIEW §6, P2) | Y | Stated fact about the setup. |
| A39 | Founder | A three-agent relay can run with the founder only deciding (coordination/README) | P | It shipped 12 migrations and has stalled since 2026-09-30. |

**Net:** 1 of 39 assumptions is evidenced. It is the one that says only the founder can talk to customers. [fact]

### 1.4 The evidence-deferral pattern

| # | Gate (where, date) | What happened | Label |
|---|---|---|---|
| 1 | 14-day test: 30 messages, 5 calls, 3 reports (§5, 09-24) | Superseded by §8 on day 5. No result recorded. | [fact] |
| 2 | "No fourth document until 25 users" (§7, 09-24) | Loosened in the README. 13 coordination docs added since. | [fact] |
| 3 | "10 outside agents onboarded" (§8, 09-29) | Replaced the same day. | [fact] |
| 4 | "No feature work until the wedge call" (§12.6, 09-29) | Call made that evening, then parked. Feature work resumed. | [fact] |
| 5 | Hang-up test, no product needed (§13.7, 09-29) | Never run and never retired. | [fact] |
| 6 | "No feature work before external handshake" (§15.5, §16.3) | §17–§20 built features the next day. | [fact] |
| 7 | "Binding until verifier evidence changes it" (§19.9, 09-30) | Handshake scheduled 5th of 6, so the clause can never trigger. | [inference] |
| 8 | P1: verifier test now plus 5 conversations (09-30 07:50 UTC) | Rejected by the founder. | [fact] STATUS.md |
| 9 | Gate A: 7 days, ~20 contacts, no code (§21.10) | "Explicitly deferred" (DIRECTION.md:2221). Key lifecycle built next. | [fact] re-checked 2026-10-05 |
| 10 | Install the issuer key, ~5 minutes (P2 amendment 4) | Not done as of the last STATUS. | [fact] |
| 11 | Founder sign-off removed from migrations (STATUS, 09-30) | Made building cheaper while outreach stayed unscheduled. | [inference] |

Supaprod showed the same shape. R-14 (2026-08-25) said "no outreach until a full seven-station loop runs." R-18 set strict acceptance that was never met. R-43's 10-day test was replaced by Infinity the next day. Six weeks of building followed market-validation's "contradicts the business" on 2026-08-11. [fact] supaprod RULINGS.md, direction-search-2026-09.md §1.

---

## 2. Supaprod re-examined

### 2.1 What it was

[fact] README.md, updated 2026-09-02, and docs/strategy/README.md, 2026-09-23:

| Pillar | Repo name | Promise |
|---|---|---|
| 1. Tells you what to build and builds it | Layer 01, "the director" | Ranks what to build from signals, data, competitors and past calls |
| 2. Operating system for the lifecycle | Layer 02, "the operating system" | Seven stations: Discover > Decide > Plan > Design > Build > Ship > Learn |
| 3. Learns and guides | Layer 03, "the brain" | Graded outcomes re-rank layer 01. Claimed as the only defensible layer. |

Pricing: Free, Pro $20/mo, Business $50/seat. Billing was built and switched off. There were five framings in ten weeks and 13 versioned positionings before that. [fact] supaprod-internal-evidence-2026-09.md; docs/strategy/archive v1–v13.

### 2.2 Why it stopped

[fact] supaprod-internal-evidence-2026-09.md (2026-09-23), A1-REPORT.md (2026-09-02), RULINGS R-42 (2026-09-23):
- About 630k lines of TS, 634 migrations, 2,508 files.
- 16 auth users, 4 with a real Google identity, none signed in after 2026-07-19. Zero revenue.
- 0 of 25 design partners contacted.
- Exactly one run walked all seven stations (d1168015). Ship declined, and the forecast was about Supaprod's own PRD approval.
- `scout_snapshots` = 0 rows, ever. The discovery station never ingested one outside signal.
- 133 of 133 learnings are seed data. The brain tools had 0 calls across 2,652 runs (PRODUCT-TRUTH.md, 2026-08-26).
- The thesis is bundled by Linear, Atlassian, Notion and Anthropic's free PM plugin. [unverified] Those external dates are repo-reported.
- Five documented programme rejections. A sixth is claimed in direction-search, and no record backs it. [unverified]
- Founder, 2026-09-23: "Now I do not have energy, as well as time and money, to focus on these things for building nothing." [fact] docs/prompts/strategy-reset.md

### 2.3 What reviewers said

| Source (date) | Quote | Label |
|---|---|---|
| YC (2026-08-29) | "your startup was not selected for an interview... we can't give you individual feedback" | [fact] docs/pitch/yc/OUTCOME.md |
| Hub71 (2026-08-24), the only letter that names its criteria | "clearly defined a critical and widely prevalent problem... compelling evidence showcasing the effectiveness and scalability" | [fact] hub71/OUTCOME.md |
| Campus Founders (2026-08-24) | "teams that more closely match the specific criteria" (two-co-founder bar) | [fact] |
| Repo's own validation (2026-08-11) | "Outside evidence confirms the problem, confirms the default, and contradicts the business." | [fact] market-validation-2026-08.md §1 |
| Same, §8.5 | "the people with authority to buy it are the people it exposes." | [fact] |
| AI stress test (2026-06-11) | "Supaprod has built an engine room and called it a ship... real capability, zero felt story." | [fact] v4-stress-test.md |
| Founder (2026-08-24) | "I myself have not seen one single loop or entire journey running from end to end on its own." | [fact] DIAGNOSIS.md |
| AI audit (2026-08-25) | "Nothing here was missing. Everything here was unwired." | [fact] ROOT-CAUSE.md |
| Operating model (2026-08-26) | "Nothing on the queue fixes this, because everything on the queue adds to it." | [fact] |
| Strategy reset (2026-09-23) | "The right problem for the wrong buyer." | [fact] |
| Direction search (2026-09-28) | "A different idea run the same way fails the same way." | [fact] |
| Self-audit overclaim (2026-08-27) | "Machinery is proven to work (track d1168015 completed all 7 stations)" | [fact] AUDIT.md:21. Contradicted by A1-REPORT, 2026-09-02. |

### 2.4 What the thesis got right and wrong

| Right | Wrong |
|---|---|
| [fact] Building got cheap. One founder directing agents produced about 630k lines in about 16 weeks. | [inference] It assumed software could remove the bottleneck. The bottleneck is talking to people who might pay, and no tool does that for you. |
| [fact] Incumbents agree: Linear's Agent launch says the bottleneck moves to "deciding exactly what to build" (https://linear.app/changelog/2026-03-24-introducing-linear-agent, 2026-03-24). | [fact] Universal agreement turned it into a bundled feature. Linear briefs that "test the idea, evidence, and risks" (about 2026-09-08), Notion Ship OS is free, ChatGPT Space shipped 2026-09-29 (https://pasqualepillitteri.it/en/news/19316/openai-launches-chatgpt-space). |
| [inference] A decision record made before the outcome is known cannot be backfilled. | [fact] The buyer is the person the record exposes, on a $15–50 seat budget (strategy-reset §2). |
| | [fact] It was a function-horizontal platform built by a solo founder: seven stations, three layers. |

### 2.5 Is any narrow expression worth building now?

No. The sharpest remnant is wedge d: an evidence gate that blocks a coding agent from starting a feature unless a dated outside signal is attached. It scores 15/35 with willingness to pay 1 and lab risk 1 (§7). [fact] Linear ships the evidence-to-brief step (https://linear.app/changelog/2026-09-24-new-controls-for-linear-coding-agent, 2026-09-24). Coding sessions that run Claude Code or Codex are a separate feature (2026-06-11). Keep the gate as a personal rule on your own repos: no code before a stranger's dated signal. Do not sell it.

### 2.6 Founder-constraints finding

[inference, built on facts in strategy-reset §14 (2026-09-23) and R-43 (2026-09-28)] Read together, the constraints hurt more than they help. They push toward horizontal infrastructure, where labs and incumbents already sit, and they rule out every narrow option with a buyer you can reach.

| Constraint | Effect | Action |
|---|---|---|
| #2 "huge, untapped, not a niche" | It was the stated reason for declining the finance pivot (R-42), and Infinity widened within 5 days because of it. | **Drop** |
| #4 "not one narrow kind of work" | Pushes toward platforms that are horizontal by function | **Replace** with: one job, every surface |
| #6 "provable fast enough to raise" | Read as "pitchable code" | **Redefine:** a stranger paid within 30 days |
| #1 lab-proof, #3 product not services, #7 B2B first | Useful | **Keep**. Hand-run delivery to the first 10 customers is fine. |
| #5 not finance | Rules out your strongest founder-market fit | **Closed** until new first-party evidence exists and the Intellect contract has been read |
| R-43 "no product code before a hand-run test passes" | The most valuable rule in either repo. Overridden within a day. | **Make hard.** A deferred gate counts as a failed gate. |
| Unwritten: the frontier-lab job hunt | Competes for outreach hours. A lab offer brings an invention-assignment clause. | **Decide on 2026-10-16** |

[fact] Under Indian law (Contract Act s.27), post-employment non-competes are void, while IP assignment and confidentiality clauses are enforceable (https://www.mondaq.com/india/contract-of-employment/941370/indian-law-on-the-validity-of-trade-and-employment-restraints, 2020). [unverified] The Intellect contract itself is unread.

---

## 3. Market map

### 3.1 By segment

| Segment | Who pays | How much | Who wins | What labs commoditize in 12 months |
|---|---|---|---|---|
| Lab roadmaps | Consumers and teams through subscriptions | [fact] $500 ChatGPT Pro tier (https://thenextweb.com/news/openai-devday-pro-200-usage-cut-pro-500-plan, 2026-09-29). Agent 365 is $15/user (prior, 2026-05-01). | [fact] OpenAI Dots, Agents API, Space (https://openai.com/index/devday-2026-recap/, 2026-09-29). Claude Managed Agents (2026-04-08). [fact, vendor-reported] Agent 365 has nearly 50M registered agents (techcommunity.microsoft.com, 2026-09). | [inference] Runtime, memory, sandboxes, per-vendor spend limits, approvals, self-disclosure, own-bot signing. Not: control over rivals' agents, or evidence that holds up against the vendor. |
| Agent platforms | Consumers $20–100/mo | [fact] Instinct raised $1B at $10B with 14 employees (https://theaiinsider.tech/2026/09/29/instinct-announces-1b-in-series-c-funding-from-sequoia-benchmark-and-coatue-at-10b-valuation/, 2026-09-29) | Muse, Instinct, Dots, Gemini. [fact] Shopify partnerships via WebMCP and Shop Pay (https://www.contentgrip.com/shopify-muse-shop-pay/, 2026-09-21) | [inference] Big tech owns the layer. Bilateral deals remove any need for a third-party credential. |
| MCP / tool gateways | IT/security; small teams pay tens of dollars | [fact, secondary] Composio Pro $29/mo, repriced 2026-08-15 (https://usagepricing.com/blueprint/composio). [fact] Runlayer $11M seed (finance.yahoo.com, 2025-11) | Okta Agent Gateway (announced 2026-09-22), Runlayer, MintMCP, Composio. Protocols at the Linux Foundation AAIF. | [inference] Gateways become a standard IdP feature. |
| Payments and commerce rails | Merchants and issuers via network fees | [unverified] Real x402 settlement about $28K/day, around half wash-traded (https://www.ainvest.com/news/x402-volume-93-ytd-agentic-ai-trade-depends-real-settlement-hype-2608/, 2026-08) | [fact] Mastercard Verifiable Intent (https://www.pymnts.com/mastercard/2026/mastercard-unveils-open-standard-to-verify-ai-agent-transactions/, 2026-03-05). Visa TAP on RFC 9421. Amex ACE. Stripe Issuing for agents. Cloudflare Wallets (2026-08-04). | [fact] Caps, merchant locks, freeze and registered-agent liability already ship. [inference] FIDO merges the mandate standards. |
| Agent identity / KYA | CISOs per seat; receivers per check | [fact] No KYA vendor publishes a price (searched 2026-10-05). Okta prices agentic products "per agent" with no public figure (https://www.marketbeat.com/instant-alerts/okta-q4-earnings-call-highlights-2026-03-04/, 2026-03-04). | Entra, Okta, Palo Alto–CyberArk. Baselayer VCs (2026-09-23). Experian with Skyfire (2026-04-30). Akamai KYA (2026-06-16). DigiCert AI Trust Manager GA (date [unverified]). | [fact] Request signing is done (Web Bot Auth). FIDO TWGs chaired by Google, OpenAI, Amazon, Okta, Visa and Mastercard (2026-04-28). [inference] A neutral issuer becomes a commodity implementer role. |
| Runtime control for coding agents | CISOs; small teams via DIY or free OSS | [fact] HOL Guard is Apache-2.0 with a paid Guard Cloud, price [unverified] (https://pypi.org/pypi/hol-guard/json, 2026-10-05). [unverified] Pushary $9.99/mo; AgentGuard Pro $39/mo (vendor snippets). | Claude Code auto mode (GA 2026-07-10), Remote Control, NVIDIA OpenShell (2026-09-28), Okta, HOL Guard | [fact] Labs already ship this for their own runtimes. Cross-vendor is filled by OSS. |
| Agent audit evidence / GRC | Companies with SOC 2 audits and security reviews | [fact] Signet and halo-record are free (GitHub, 2026-10-05). Drata and Vanta prices [unverified]. | [fact] Claude Compliance API covers Claude Code (https://claude.com/blog/compliance-api-cowork-and-claude-code, 2026-08-11). [vendor snippet] Drata AI Agent Governance in LA (2026-08-04). [unverified] Vanta Agentic Trust Controls GA (late Aug 2026). | [inference] Labs export their own logs. GRC vendors own the auditor relationship. The open question is acceptance. |
| Insurance / assurance | Deployers and platforms | [fact] Premiums not public. AIUC $40M (https://siliconangle.com/2026/09/15/ai-agent-certification-startup-aiuc-raises-40m-to-begin-auditing-frontier-models/, 2026-09-15) | AIUC-1 with ElevenLabs as first policy (https://fintech.global/2026/02/12/elevenlabs-unveils-first-ai-insurance-for-voice-agents/, 2026-02-12). Armilla/Chaucer. | [inference] Labs stay out because independence is the product. Platforms bundle readiness instead. |
| Voice | SMBs for receptionists; consumers through subscriptions | [fact, secondary] $0.07–0.33/min (consumer-surface doc, 2026-09-28) | [fact] Muse and Instinct calling (2026-09-16). Google calling self-identifies (https://getcoai.com/news/googles-ai-assistant-now-makes-business-calls-for-users-nationwide/, 2026-05-19). Pindrop BotStopper (2026-09-16). | [inference] Each lab vouches for its own calls. Pindrop covers enterprises. |
| PM / what to build | PM seats at $15–50 | [fact, prior] ChatPRD makes six-figure revenue on about 100K users (every.to, 2026-08-25) | Linear, Notion Ship OS, ChatGPT Space, Amplitude | [fact] Already bundled |
| Vertical agents | Line-of-business budgets, outcome pricing | [fact] Fin $0.99/resolution (https://stripe.com/customers/fin-ai, accessed 2026-10-05) | Sierra, Decagon, Fin, Harvey | [inference] Templates squeeze the number twos. The vendor stays the judge of outcomes. |

### 3.2 Competitors re-verified

| Player | Owns | Weak spot | Label and source |
|---|---|---|---|
| Baselayer | Risk checks for 2,000+ US FIs; W3C VCs binding agent to platform and business | No named non-bank verifier, no price | [fact, vendor-reported] fintech.global, 2026-09-23 |
| Experian + Skyfire | Human-to-agent binding, merchant-verifiable tokens | Bureau-centric, no acceptance count | [fact] experianplc.com, 2026-04-30 |
| Mastercard Verifiable Intent | Open SD-JWT delegation chain | Card rails only | [fact] pymnts.com, 2026-03-05 |
| Shopify | Agent access to merchants via registered keys and tiers | No neutral slot needed | [fact] searchenginejournal.com, 2026-09-28 |
| DigiCert AI Trust Manager | Passport, visas, kill switch | Enterprise PKI; no customers named | [fact] digicert.com; GA date [unverified] |
| Pindrop BotStopper | Contact-centre agent detection; 5,000+ voice registry | Detection only, no delegation; enterprise only | [fact] financialcontent.com, 2026-09-16 |
| HOL Guard | Local-first approve/block across 16 harnesses | Adoption numbers unknown | [fact] pypi.org/pypi/hol-guard/json, 2026-10-05 |
| Signet | Ed25519 signed receipts with delegation chains; SOC 2 mapping | 39 stars, no hosted service | [fact] github.com/prismer-ai/signet, 2026-10-05 |
| halo-record | Hash chain plus witness checkpoints plus RFC 3161 | Unsigned; 83 stars | [fact] github.com/bkuan001/halo-record, 2026-10-05 |
| Drata | SOC 2 evidence channel; AIUC-1; agent proxy plus evidence feed | Limited Availability; Anthropic-first | [unverified] vendor snippets, 2026-07-16 and 2026-08-04 |
| Claude Compliance API | Claude Code transcripts with tool calls (Enterprise) | Single vendor; self-certification | [fact] claude.com/blog, 2026-08-11 |

### 3.3 Corrections to the repos

| Repo claim (location) | Correction | Label and source |
|---|---|---|
| "Baselayer sells a check, we issue the identity" (DIRECTION.md:878, :887) | Baselayer issues VCs | [fact] fintech.global, 2026-09-23 |
| "Baselayer starts with 2,300 verifiers" (DIRECTION L760 and others) | They are FI customers; none is a named verifier. Press says 2,000+ or 2,300. The repo's "$47M total" is internally inconsistent; press says about $40M. | [fact] fintech.global and pulse2.com, 2026-09 |
| Voice has "zero direct competitors" (§12.6) | Pindrop, Google, Muse and Instinct are all in it | [fact] see §3.2 |
| "Meta now pays humans to place calls" (README.md:50) | It was an internal test, since rolled back | [fact] cp24.com, 2026-09-22 |
| "Our slot is inside UCP" (§11.3, AGENTS.md) | Shopify gates on its own key registry and on partnerships | [fact] shopify.dev docs, 2026-05-07 and 2026-09-28 |
| Consumer safety rail "genuinely unoccupied" (§12.6) | Dots, Cloudflare Wallets, Stripe Issuing and Ramp all ship controls | [fact] 2026-05 to 2026-09 |
| Network liability is a future threat (§14.3) | Amex coverage already exists | [fact] emarketer.com, 2026-04 |
| "Ride RFC 9421 / DPoP / Web Bot Auth" (AGENTS.md:62) | No code does this | [fact] pop.ts:15, re-checked 2026-10-05 |
| Email, phone, wallet and insurance phases (README L21–25; index.tsx:41) | No code backs any of them, and §21.11 stops them | [fact] repo |
| "x402 donated to LF 2026-07-14, $40K/day" (prior digest) | April 2026; about $28K/day real | [unverified] ainvest.com, 2026-08 |
| "No analyst category for agent trust" | Forrester Wave Q2 2026 (DataDome, Kasada as Leaders) and Gartner "AI agent identity" exist | [fact] businesswire.com, 2026-06-15 |
| "No protocol expresses book/hold" (supaprod consumer-surface L137) | UCP Lodging draft published 2026-09-25 | [fact] github.com/Universal-Commerce-Protocol/ucp/discussions/864 |
| "Labs lack a team decision system" (market-validation, 2026-08-11) | ChatGPT Space is shared and co-edited, with no outcome labels | [fact] 2026-09-29 |
| "6 decided, 6 noes" (direction-search:106) | Five are documented | [fact] applications/README.md |
| CA "further bill pending" (§12.5) | AB 410, held in committee, not law | [fact] legiscan.com |

### 3.4 Theses already rejected (do not reopen without new evidence)

| Thesis | Rejected (doc, date) | Why |
|---|---|---|
| Supaprod v1–v13 positionings | supaprod archive, 2026-05 to 2026-07 | Churn; zero market contact |
| "Cursor for PMs" | YC OUTCOME.md, 2026-08-29 | Chased an RFS two batches late; bundled |
| Decision/forecast tracking moat | market-validation, 2026-08-11 | Problem real, business contradicted |
| Check at Build | strategy-reset §5B, 2026-09-23 | Code review costs about $1–1.50 a run |
| Regulated-FS validation | R-42, 2026-09-23 | **Declined on preference; never refuted** |
| CFO AI-spend ledger | strategy-reset §10 | Thin |
| Direction B, service supply side | R-43, 2026-09-28 | Abandoned untested the next day |
| Agent attestation and delegation | DIRECTION §3.1, 2026-09-24 | Rejected, then adopted 5 days later with no new evidence |
| Marketplace / "Hugging Face for agents" | MARKETPLACE-REVIEW, 2026-09-24 | Catalogs owned; payouts $100–500/mo |
| Option A consumer agent; Option B passport only | §21, 2026-09-30 | Big tech owns A; B is necessary and insufficient |
| Own the rails; self-issued trust score | §21.11; AGENTS.md | Rails owned; a self-issued score is not neutral |
| Avoid list | agentic-stack-and-absorption-2026-09.md | Infinity's §8 entered three avoided categories: identity, wallets, approvals |

---

## 4. Gap list

| ID | Gap | Cited evidence | Maturity |
|---|---|---|---|
| **G1** | **Third-party acceptance of an agent-action record.** An auditor, underwriter or reviewer that rejects vendor logs and free OSS records and names a format it would accept. | [fact] AIUC-1 asks for tool-call, delegation and approval evidence (https://www.compliancepoint.com/regulations/aiuc-1/, secondary). [unverified] Vendor posts say the AICPA has no AI-specific criteria, so auditors assemble agent evidence ad hoc (waxell.ai, mintmcp.com, probo.com snippets). [fact] Signet and halo-record exist free (2026-10-05). [fact] The Compliance API exists (2026-08-11). | Immature, and maybe nonexistent. No gatekeeper has been asked. Drata and Vanta are the likely owners. [inference] |
| G2 | Cross-rail dispute evidence for agent actions outside one network's closed loop: unregistered agents, x402, UPI, service bookings | [fact] Amex covers registered agents only (2026-04). [fact] Agentic UPI has no recourse rules (https://www.medianama.com/2026/09/223-npci-ai-agents-upi-payments/, 2026-09). [unverified] Visa liability allocation. | Immature, and no payer found. As rails converge at FIDO, it becomes a network feature. [inference] |
| G3 | Verifiable accountable principal on agent calls to SMBs, across operators | [fact] Muse and Instinct don't say whether they disclose (https://www.wfmd.com/2026/10/03/ai-agents-can-now-make-phone-calls-for-you/, 2026-10-03). Pindrop's roadmap covers enterprises only (2026-09-16). | Immature and contested. Google's self-disclosure may be enough. No SMB has been found checking anything. |
| G4 | Intake gate for agent work submitted by strangers | [fact] GitHub weighed a PR kill switch (https://www.opensourceforu.com/2026/02/github-weighs-pull-request-kill-switch-as-ai-slop-floods-open-source/, 2026-02). Godot ban (https://godotengine.org/article/contribution-policy-2026/, 2026-06-30). | Weak payer evidence. The victims are unpaid maintainers. GitHub owns the surface. |

G1 as the analysis panel stated it ("nobody serves small mixed-agent teams with control plus a signed record") is **closed**. The tooling exists free. What may remain open is acceptance. [fact]/[inference]

---

## 5. Surface vs function, and what it means for V1

**Rule:** go horizontal by surface and never horizontal by function. [inference, prior] consumer-surface-and-agent-supply-side-2026-09.md §2, built on Wispr Flow $2B (https://wisprflow.ai/post/series-b, 2026-08-17) against Jasper falling from about $120M to $55M.

Three tests, all required:
1. **One job, every surface.** Option C is horizontal by function (signer, control plane and verifier edge), so it fails. [inference]
2. **Single-party value on day one.** Wedge a needs two strangers to adopt it. Wedge b needs an SMB to check something mid-call. Both fail.
3. **An increment no $0 tool ships.** This test was added after the 2026-10-05 searches:

| Layer | $0 or bundled substitute | Label |
|---|---|---|
| Approve, deny, ask | HOL Guard; Claude Code hooks; auto mode; Remote Control phone approval | [fact] pypi 2026-10-05; code.claude.com docs 2026-10-05; claude.com/blog/auto-mode 2026-03-24 / GA 2026-07-10 |
| Signed record with delegation | Signet | [fact] GitHub 2026-10-05 |
| Witnessed record | halo-record | [fact] GitHub 2026-10-05 |
| Single-vendor audit log | Claude Compliance API | [fact] 2026-08-11 |
| Auditor evidence channel | Drata, Vanta | [unverified] snippets, 2026-07/08 |
| **Named third-party acceptance** | **None found** | [inference] |

**What it means for V1:** nothing to build now. The only unclaimed increment lives in a relationship with an auditor or insurer, which no software surface reaches. If a gatekeeper does specify a record (§10), V1 is a thin export step on top of an **existing** OSS recorder, delivered by hand to the first three customers. It ships no new recorder, credential, console or migration. [inference]

---

## 6. Stakeholders, personas, and the debate

### 6.1 Stakeholder table

| Group | Job | Workaround today | Pays today | Switch trigger | Value alone? |
|---|---|---|---|---|---|
| Agent operators | Get actions completed without blocks; limit liability | Bilateral deals, Web Bot Auth, own-brand disclosure, human fallback | [fact] No third party, no KYA price found | [inference] Measured block cost plus a recipient that requires a credential. None exists. | No, for a/b/e2 |
| Receiving businesses | Admit revenue traffic, stop fraud | DataDome/Kasada/HUMAN; Akamai KYA; Visa TAP; Pindrop | Bot-management contracts (prices not public) | [inference] Losses a mandate would have prevented | No; the verifier side never pays under Infinity's model |
| Teams running agents | Avoid irreversible actions; prove what agents did | Hooks, auto mode, HOL Guard, sandboxes | [fact] $0–29 connector layer; nobody pays for the record | An incident, a second vendor's agent, a security questionnaire | Yes for control, already served free |
| PMs (Supaprod buyer) | Defend what to build | Linear, Notion Ship OS, Obsidian | $15–50/seat bundled | None observed | No as a business |
| Consumers on closed agents | Avoid overspend, get recourse | Operator controls, Amex, wallet caps | Subscriptions | Uncovered losses | No control point exists |
| Frontier labs | Get their agents accepted everywhere | Build it themselves, chair standards | Third parties only for independence | Adopt standards and build in-house | Not a buyer; absorption threat |
| Networks / PSPs | Authenticated agent intent | Verifiable Intent, TAP, Issuing | In-house | Off-rail evidence only | Not a buyer |
| **Auditors / insurers** | Evidence independent of the vendor | AIUC-1, ad hoc request lists, Drata/Vanta | Audit and certification work | **The leading test asks this group** | Gatekeeper; decides whether a business exists |
| Regulators | Disclosure, recourse | Art. 50 (in force); CERT-In proposals | n/a | Mandated audit trails | Forcing function |

Sources: §3 rows; personas analysis; [fact] CSA skimming campaign, 600K+ cards stolen (https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/09/CSA_research_note_ai_agent_retail_skimming_campaign_20260924-csa-styled.pdf, 2026-09-24).

### 6.2 Personas

All are [inference] composites. Nobody has been interviewed.

| Persona | Role | JTBD | Cost of the problem | Objection |
|---|---|---|---|---|
| **Tech lead, mixed fleet** (10–80 person US/EU startup; Claude Code + Codex/Cursor + one in-house agent) | User, champion | Risky actions stop and ask on the phone; everything else proceeds; can show what the agent was allowed to do | [fact] PocketOS lost its production DB and backups in 9s (https://smarterx.ai/smarterxblog/ai-agent-database-deletion, 2026-04). [inference] $700–1,400 per engineer per month spent babysitting (assumption, unmeasured). | "I can write this hook in an afternoon, and HOL Guard is free." |
| **CTO who signs the bill** | Economic buyer | One cap, one kill switch, one audit trail across vendors; answer diligence with evidence | [fact, secondary] $7,005.71 of runaway agent spend in 4 weeks (https://accuroai.co/blog/ai-agent-incident-litigation-tracker, 2026-08/09). [fact] Uber exhausted its 2026 AI budget by April (https://techcrunch.com/2026/06/02/uber-caps-employee-ai-spending-after-blowing-through-budget-in-four-months/, 2026-06-02) | "Drata and Anthropic will cover this. Why a solo founder?" |
| **SOC 2 audit manager** (new, central) | Gatekeeper | Rely on agent evidence without re-testing | [unverified] Assembles evidence ad hoc today | "The client's Drata export and the vendor log are fine." |
| **First security hire** (50–200 people) | Blocker | Inventory and revocation for shadow agents | [fact] Hugging Face reconstructed about 17,600 agent actions (https://adtmag.com/articles/2026/07/22/openai-models-broke-out-of-test-sandbox.aspx, 2026-07-22) | "A solo vendor's binary in every developer's tool path fails procurement." |
| **The coding agent itself** | Agent as user | A fast, deterministic decision with a reason it can act on | [inference] 100–300 ms per hook call times hundreds of calls | Slow or vague hooks get disabled |
| **Trust lead at a small agent operator** | Secondary champion (e2) | Export evidence that holds up for enterprise buyers and insurers | [inference] 1–3 weeks per security review (unsourced) | "Our own logs pass. No insurer has asked for a format." |

### 6.3 The debate

| Voice | Pick | Core argument | Where they break from the others |
|---|---|---|---|
| **Founder** (the shipped-infra persona on the panel) | KILL | Pushary, HOL Guard and AgentGuard already serve small teams, so the c premise is gone. 30 days solo cannot win a $10 market against free OSS. | Rejects the c majority on facts the c voters did not have |
| **VC** | c, 14-day leash | The only wedge one person can install and get value from today; founder is user zero; incidents are real. Bar: ≥5 still running and ≥2 paying. | Would build a 300-line hook during the test |
| **Buyer (CTO, 80 people)** | c, one-week test | Feels the pain; security will demand an OSS local hook with metadata-only egress | Would block any closed binary that phones home to Lovable |
| **End user** | c | Auto mode kills the single-vendor version; only cross-vendor survives. "If it shows a console or KYC in week one, I uninstall." | Would install it free and might never pay $20 |
| **Skeptic** | KILL | Half of c is what labs ship for their own runtimes. The founder's pattern makes any pick a third repeat. Your fit is regulated assurance, which constraint #5 blocks. | Scores lab risk 2, the others 3 |

**Resolution** [inference]. The vote was 3–2 for c. Both camps prescribe the same 10 days: no code, named outreach, a number to hit. They disagree only on the default outcome. Two later facts settle it for KILL:
1. Chair searches on 2026-10-05 confirmed the free tools.
2. Both adversarial reviews found Signet and halo-record, which already ship the signed record the c voters called unclaimed.

Seven deferred gates set the default to archive.

---

## 7. Scored verdict, adversarial review, and the labs question

### 7.1 Final score table

Each axis is scored 1–5, where 5 is best. For lab risk, 5 means safest.

| Wedge | Pain | Freq | WTP | Lab risk | Founder dist. | Time to paid | Day-one value | **Total /35** | Note |
|---|---|---|---|---|---|---|---|---|---|
| c: control + signed record | 4 | 4 | 2 | 2 | 3 | 1 | 2 | **18** | Down from 20. [fact] Signet and halo-record make the record free; HOL Guard makes approvals free. |
| d: evidence gate (Supaprod remnant) | 3 | 2 | 1 | 1 | 3 | 2 | 3 | 15 | Use as a personal rule only |
| e1: intake verification | 3 | 3 | 1 | 3 | 1 | 1 | 2 | 14 | No paying receiver |
| b: verified voice | 3 | 3 | 1 | 2 | 1 | 2 | 1 | 13 | Google self-discloses; Pindrop exists |
| e3: outcome referee | 2 | 3 | 1 | 4 | 1 | 1 | 1 | 13 | No payer; Big Four territory |
| **e2: insurer/auditor evidence** | 2 | 1 | 2 | 4 | 1 | 1 | 1 | 12 | **The question the leading test asks.** The table has no column for incumbent risk from Drata or Vanta. |
| a: bilateral verification (Infinity now) | 2 | 3 | 1 | 1 | 1 | 1 | 1 | 10 | Every component already owned |
| Supaprod full platform | 3 | 2 | 1 | 1 | 1 | 1 | 1 | 10 | Unanimous |

The highest score is 18/35, which is 51%. No wedge clears a build bar. [inference]

### 7.2 Adversarial review results

| Review | Claim | Verdict | Effect |
|---|---|---|---|
| Labs-competition | The "one unclaimed increment" is false. Signet ships it free; Drata enters the SOC 2 evidence channel; the Compliance API covers Claude Code. | **Accepted, serious.** I fetched Signet myself. | Runner-up cut down to the e2 question |
| Demand-fit | halo-record plus Preloop plus Vanta controls; no auditor has demanded a signed record | **Accepted, upgraded to serious.** Correction: halo-record is hash-chained and unsigned. | Pass bar must control for free tools |
| Demand-fit alternative | Ask auditors and underwriters first (3–5 days) | **Adopted as stage 1** | Two-stage gate |
| Labs-competition | Drop the test, archive 2026-10-06 | **Rejected.** Quitting without asking mirrors Supaprod. Five days of email carries no IP risk. | One zero-code check kept |
| Fact-check | Pushary features, AgentGuard hook, auto-mode "force pushes", Okta quarter, Shopify "requires", Linear handoff, Supaprod "0 users" | Corrected or marked [unverified] | Applied throughout |
| Final review pass (2026-10-05) | Spot-check cited URLs and repo line references | **Partial.** Stopped on a session cost limit before any URL was re-fetched. Ten repo references re-checked and match (see header). | External [fact] labels rest on the drafting pass only |

### 7.3 Will the labs ship it?

**For their own agents they mostly already have.** [fact]
- Claude Code PreToolUse returns allow/deny/ask/defer (https://code.claude.com/docs/en/hooks, 2026-10-05).
- Auto mode classifies each action (2026-03-24, GA 2026-07-10).
- Remote Control holds permission prompts for phone approval, with push (https://code.claude.com/docs/en/remote-control, 2026-10-05).
- The Compliance API exports Claude Code sessions (2026-08-11).
- Codex documents PreToolUse hooks (https://developers.openai.com/codex/hooks, snippet 2026-10-05); a 2026-04-15 guide says Bash only [unverified today].
- Dots keeps money movement with the user (2026-09-29).

**Across vendors, no.** A lab gains no token use by governing a rival's agent, and its own log is self-certification. [inference] That gap is already filled by HOL Guard, Signet and halo-record (free), by Drata and Vanta [unverified], and Okta has announced a gateway kill switch for Q4, possibly fiscal [fact, okta.com, 2026-09-22]. The labs leave a gap, and others filled it in 2026.

---

## 8. Problem, ICP, why now

**Problem statement (hypothesis, demand unverified):** Auditors, insurers and security reviewers are starting to ask how a company's AI agents are governed, and it is unknown whether any of them will reject vendor logs, GRC exports and free OSS records and specify an independent record they would accept.

**ICP (one sentence, [inference]):** The gatekeeper is a SOC 2 audit manager or AI underwriter (AIUC, Armilla) reviewing 10–200 person US/EU software companies; the payer, asked only if a gatekeeper says yes, is the CTO of a 10–80 person company that runs Claude Code plus another vendor's agent against production, has an open audit, review or renewal, and has already seen Signet, HOL Guard and its own Drata or Vanta account.

**Why now:**

| Reason | Label and source |
|---|---|
| You said you have no energy, time or money left "for building nothing" | [fact] strategy-reset.md, 2026-09-23 |
| Sunk cost is compounding: a key-recovery migration is queued for zero users, and the live site lists insurance as a future phase with no code behind it | [fact] repo, 2026-10-05 |
| The lab track needs a dated answer; 2026-10-16 is proposed here | [proposal] advisor-proposed date, not found in either repo; Rohit sets the real one |
| The recorder layer closed between April and August 2026 (Signet v0.4.6 2026-04-08; HOL Guard 2026-06-11; Compliance API 2026-08-11) | [fact] |
| Acceptance may still be undecided, and the parties best placed to decide it (AIUC, Drata, Vanta) are moving now, so the check is this week or never | [inference] |

---

## 9. How we should work (operating model)

### 9.1 What went wrong

| Pattern | Supaprod | Infinity |
|---|---|---|
| Gate set, then deferred for more building | R-14, R-18; 0 of 25 contacted | §5, §13.7, P1, Gate A (DIRECTION.md:2221) |
| Decisive negative finding ignored | Built for 6 weeks after 2026-08-11 | 2,635 lines of key lifecycle written the day after Gate A was deferred |
| Process grew faster than evidence | About 406k markdown lines; 571 programmes tracked | 2,396-line DIRECTION.md; 13 coordination docs; a 3-agent relay with no customer step |
| Predictions locked, never graded | P1–P5 result columns still "—" | No prediction table at all |
| Claims ahead of code | AUDIT.md "machinery proven" | index.tsx:41 insurance; AGENTS.md:62 RFC 9421 |

All [fact], repo files as cited. [inference] The ideas are not where this went wrong. Building was the default action, and evidence was something a ruling could defer. The model below inverts that: **archive is the default, and building has to be earned.**

### 9.2 Rules (binding from 2026-10-06)

1. **A deferred gate is a failed gate.** You can override only in writing, dated, naming the new evidence, with a new stop date no more than 7 days out.
2. **One open gate at a time.** No new framing or document while a gate is open.
3. **Build budget follows evidence:**

| Evidence state | Product-code hours | Migrations | Agents building |
|---|---|---|---|
| Now until stage 1 passes | 0 | 0 | none |
| Stage 1 passed | 0 (stage 2 is concierge) | 0 | none |
| Stage 2 passed **and** still a founder after 10-16 | ≤15 h/week, one workflow, adopting an OSS recorder | 0 until a payer's data needs one | one coding agent, you supervising |
| A gatekeeper accepted a real pack | ≤30 h/week | allowed, reviewed | revisit |

4. **Documents:** one tracking sheet plus one note per week of at most one page. Nothing else.
5. **Nothing public without your explicit approval.** This matters because of the job hunt. Outreach uses a template you approve once on day 0.
6. **Claims need code or evidence.** Remove unbacked public claims first.

### 9.3 Pause the relay

Pause Kiro, the supervisor and Lovable, effective 2026-10-06. [inference] The relay produced correct, live-verified engineering and caught real defects (the anon `record_signed_action`, MCP mutations, two spend-cap bypasses: [fact] AGENTS.md, STATUS.md). It has zero capacity for customer evidence.

Before the pause, you do these yourself:
- (a) Tell Lovable not to apply `20260930070000_agent_key_lifecycle.sql`.
- (b) Unpublish or relabel infinityalpha.lovable.app as an archived prototype. It signs in provisional mode ([fact] STATUS.md 2026-09-30).
- (c) Move or rotate the DIDIT_* values in the local `.env` (STATUS item 6).

Keep two disciplines for later: live-probe verification and the quality gates.

### 9.4 Time split with the job hunt

| Rule | Detail |
|---|---|
| Lab track first, 2026-10-06 to 10-16 | It is the real fork |
| Founder-track cap | 2.5 h per weekday, 12 h/week, all outreach and calls |
| Blocks (IST) | 10:00–11:30 sending; 18:30–21:30 calls, which overlap US-East mornings and the EU afternoon. Max 2 calls/day. [inference] |
| IP hygiene | No code on Anthropic or OpenAI hook surfaces. Interviews ask about gatekeeper behaviour and pitch nothing. Read the Intellect contract on day 0. |

### 9.5 Decision rights

| Decision | Owner | Constraint |
|---|---|---|
| Gate definitions | Locked in this doc before day 1 | Not editable after the first send |
| Grading | The tracking sheet | You read the result; you do not reinterpret it |
| Override | You | Written, dated, names new evidence, stop date ≤7 days |
| Public posts | You | Each time |
| Starting code | Nobody, until §9.2 allows it | An agent that starts is stopped |

### 9.6 Weekly scorecard (Fridays, 15 minutes)

| Metric | Week 1 (10-06 to 10-10) | Week 2 (10-11 to 10-15) |
|---|---|---|
| Contacts sent | ≥20 gatekeepers, ≥15 deployers | ≥15 qualified deployers |
| Reply rate | ≥15% gatekeepers | ≥25% deployers |
| Conversations | ≥5 | ≥8 |
| Artefacts (request lists, questionnaires) | ≥1 | ≥2 |
| Written (a)(b)(c) specs | **≥1 (gate)** | n/a |
| Deposits ≥$200 or dated LOIs | n/a | **≥3 (gate)** |
| Product-code hours | 0 | 0 |
| New strategy docs | 0 | 0 |
| Lab-track hours | ≥ founder-track hours | ≥ founder-track hours |

---

## 10. Validation plan

### 10.1 Riskiest assumption

[inference] At least one named gatekeeper (SOC 2 auditor, AI underwriter, enterprise security reviewer) will do all three of these:
- (a) discount vendor-native agent logs (the Compliance API, or Drata- or Vanta-collected evidence);
- (b) discount free OSS records (Signet, halo-record) and name the property they lack;
- (c) specify an independent record it would accept or require.

It is the riskiest because every other layer has a $0 or bundled substitute (§5). If no gatekeeper rejects them, nobody has a reason to pay.

### 10.2 Cheapest test

Zero-code written outreach and calls, 2026-10-06 to 2026-10-10. No landing page and no fake door: a gatekeeper does not buy, so a page would only measure curiosity. [fact, computed] 2026-10-10 is a Saturday, so you have four working days, and the deadline does not move.

### 10.3 The 10-day sprint for the top two wedges

**Track G (leading: the e2 question)** and **Track D (runner-up: wedge c)** run as one sprint. Track D is discovery only until G passes.

| Day | Date | Track G | Track D | Hours |
|---|---|---|---|---|
| 0 | Mon 10-05 eve | Read the Intellect contract. Approve both templates. Do the archive actions in §9.3. | — | 2 |
| 1 | Tue 10-06 | Open 30 AI-startup trust-centre pages and count which audit firms appear; the top 5 become targets. Name 20 people. Send 10 (5 audit firms, AIUC, Armilla, one more underwriter, 2 TPRM leads). | Pull 25 deployer names from Signet, halo-record and HOL Guard stargazers with public company affiliation, plus HN and X. Send 8 discovery asks. | 2.5 |
| 2 | Wed 10-07 | Send the remaining 10 | Send 7 more (15 total) | 2.5 |
| 3 | Thu 10-08 | One follow-up to every non-reply. Ask everyone who replies for their request-list wording. | Calls. Ask "who asked you?" and feed those names to G. | 2.5 |
| 4 | Fri 10-09 | Ask promising gatekeepers for (a)(b)(c) in writing. Grade P1. Scorecard. | Grade P5 | 2.5 |
| 5 | Sat 10-10 | **Gate G graded. Fail means archive that day; D stops.** | — | 1 |
| 6 | Sun 10-11 | If G passed: write the gatekeeper's spec as one paragraph | Re-screen D for "has seen the free options". Recruit 10 more. | 1.5 |
| 7–9 | 10-12 to 10-14 | Ask the gatekeeper whether it will review a sample pack | Money asks to ≥15 qualified; concierge set-up for anyone who pays | 2.5/day |
| 10 | Thu 10-15 | — | **Gate D graded.** Grade P6. | 1.5 |
| — | Fri 10-16 | **Lab-track decision, whatever the result** | | — |

Named conversation targets with public evidence:
- PocketOS founder: incident, [fact] smarterx.ai, 2026-04.
- Hugging Face security, as a reference call: [fact] adtmag, 2026-07-22.
- ElevenLabs, a reference on which evidence the underwriter required: [fact] fintech.global, 2026-02-12.

Candidate audit firms (A-LIGN, Prescient, Johanson, Insight Assurance, Sensiba) are [unverified]. Contact them only if they appear in the trust-centre counts.

### 10.4 Scripts (past behaviour and money only)

**Gatekeepers** (20 minutes, or 5 written questions; no product named):
1. "In your last five SOC 2 audits, reviews or underwriting files for software companies, how many clients had AI agents with production access?"
2. "For the most recent one, what did you ask for about agent actions? Can you share the request-list wording, redacted?"
3. "What did the client hand over: a vendor export (for example the Claude Compliance API), Drata or Vanta evidence, screenshots, their own logs? Did you accept it as is?"
4. "Have you ever rejected or discounted agent-action evidence? Why? What happened next?"
5. "Have you seen an open-source signed or timestamped record (Signet, halo-record) in a client file? What would it have to show for you to rely on it?"
6. "If a client brought a record of what an agent was authorised to do against what it did, what properties would make you accept it without re-testing? Who else in your firm decides?"
7. "Would you put that in writing as part of a client's request list?" This is the pass question.

**Deployers** (days 1–5, no pitch, no price):
1. "Which agents touch production today, from which vendors, run by whom?"
2. "Tell me about the last time an agent did something nobody authorised. What did it cost? What did you change afterwards?"
3. "In the last 90 days, has an auditor, customer security review or insurer asked how your agents are governed? Who exactly? What did you send?"
4. "What do you pay today for anything that touches this: Drata or Vanta, Composio, Claude Team or Enterprise, OSS you maintain?"
5. "Have you looked at Signet, halo-record or HOL Guard? Installed, abandoned, never tried? Why?"
6. "Can you forward the actual question the auditor asked?"

Stage 2 adds, only if G passed: "[Named gatekeeper] specified [record X]. Your tools produce [Y]. I will hand-assemble X for your current audit window. The pilot is $1,500. A $200 refundable deposit holds a slot this month. Card or wire today?"

### 10.5 Pass bars

| Stage | Pass | Fail leads to |
|---|---|---|
| G (2026-10-10) | ≥1 named gatekeeper's written, dated reply meeting (a)(b)(c), out of ≥8 contacted | 0 means archive on 10-10 |
| D (2026-10-15) | ≥3 of ≥15 **qualified** deployers pay ≥$200 refundable or sign a dated $1,500 pilot LOI. Each names the third party that asked and has seen Signet, HOL Guard and its Drata or Vanta account. | <3 means archive on 10-15 |
| Override | One insurer or AIUC-aligned underwriter agrees in writing to accept the format | Reverses the KILL on its own |

**Never counts:** stars, installs, likes, "I would pay", "interesting", "send a deck", "depends on the client", a reply that accepts vendor logs or names Drata or Vanta as sufficient, LinkedIn engagement, a founder-built demo.

### 10.6 Denominator

One private sheet, kept outside the frozen repo. **Create the row before you send the message.**

Columns: `id | track | name | org | role | size | channel | source URL | template version | sent | follow-up | replied | call held | verbatim answers | artefact (Y/N, link) | meets a/b/c | seen Signet/HOL/Drata-Vanta | third party named | money asked | money received | next step | disqualified (reason)`

Someone who never replies stays in the denominator. Nobody is deleted for "bad fit" after the fact.

### 10.7 Locked predictions

Grade each on its due date and never edit a row. The probabilities are [inference] priors, recorded before any result.

| # | Prediction | P | Due | Result |
|---|---|---|---|---|
| P1 | ≥20% reply rate from ≥8 gatekeepers | 30% | 10-09 | — |
| P2 | ≥1 gatekeeper shares its real agent-evidence request list | 25% | 10-10 | — |
| P3 | ≥1 written (a)+(b)+(c) reply | 15% | 10-10 | — |
| P4 | ≥1 gatekeeper says Drata or Vanta evidence is sufficient | 50% | 10-10 | — |
| P5 | ≥5 of ≥15 deployers name a third party that asked about agent governance in the last 90 days | 35% | 10-10 | — |
| P6 | ≥3 of ≥15 qualified deployers pay a deposit (only if G passes) | 20% | 10-15 | — |

---

## 11. V1 plan (only if both stages pass and you stay a founder after 2026-10-16)

### 11.1 One workflow

*"Hand my auditor or underwriter the agent-action record they asked for, for this window, in a form they can check without trusting me or you."*

What the user sees: one install step using an existing OSS recorder, one command ("Export for [gatekeeper], [dates]"), and one link the gatekeeper opens and verifies in their own browser.

| In | Out |
|---|---|
| Adopt Signet or halo-record (no new recorder) | Approvals, phone push, kill switch, spend caps (HOL Guard, Remote Control and Stripe Issuing ship them) |
| Map entries to the named gatekeeper's request list and to AIUC-1 controls where used | Credentials, VC-JWT issuance, proof of possession, verifier edge |
| Independent anchoring: RFC 3161 plus the attester's signature | MCP server, key lifecycle, owner KYC/Didit |
| Offline in-browser verification (pattern from `jws.ts` and the Verify page) | Voice, wallet, email, trust score, dashboards, multi-tenant console |
| A coverage statement: which agents and windows the record covers, and which it does not | Any code on Anthropic or OpenAI hook surfaces while you interview there |
| Hand delivery to the first 3 customers | — |

### 11.2 30-day metric (2026-10-06 to 2026-11-04)

All three must hold:
1. ≥1 gatekeeper accepts a hand-made pack **in a real audit, review or underwriting file**, confirmed in writing.
2. ≥3 deployers have paid, either deposits converted to $1,500 pilots or ≥$4,500 collected in total.
3. Product-code hours stay within the §9.2 budget.

### 11.3 Go-to-market: first 10

[inference] No public evidence shows any company buying an independent agent-action record, so an honest named customer list is not possible today.

| # | Segment | Channel |
|---|---|---|
| 1–3 | Clients of the gatekeeper that wrote the spec, with an open audit window | Gatekeeper referral; the only channel that carries acceptance with it |
| 4–6 | Track-D respondents who named a third party | Direct follow-up from the sheet |
| 7–8 | Signet, halo-record and HOL Guard users at 10–80 person companies who hit an auditor question | Answer in GitHub issues; do not pitch |
| 9–10 | AIUC or Armilla applicants without platform-bundled readiness | Underwriter referral, with written agreement only |

**Brand:** say nothing public about Infinity until 2026-10-16. The one public asset worth drafting privately is a post-mortem along the lines of "~630k lines in 16 weeks, zero users: building vs finding out", using only verified numbers (16 auth users, 4 real Google identities, zero revenue, 0 of 25 outreach). It goes out only with your approval. [inference] It helps the lab search more than more code would.

### 11.4 Pricing

| Comparable | Price | Label and source |
|---|---|---|
| Signet, halo-record | $0 | [fact] GitHub, 2026-10-05 |
| HOL Guard | $0 core; Guard Cloud price unknown | [fact] pypi 2026-10-05; [unverified] price |
| Pushary | $9.99/mo | [unverified] vendor snippet |
| AgentGuard Pro | $39/mo | [unverified] vendor snippet; partial control per its own README |
| Composio Pro | $29/mo | [fact, secondary] usagepricing.com |
| Agent 365 | $15/user/mo | [fact, prior] 2026-05-01 |
| Fin | $0.99/resolution | [fact] stripe.com/customers/fin-ai |
| Drata, Vanta, audit fees, AIUC premiums | Not public | [unverified] |

Hypothesis [inference]: price per evidence window against the cost of the audit or insurance event. Never price per seat against approval tools.
- Pilot: $1,500 per window, hand-assembled.
- Ongoing: $300–500 per month per company.
- Test: a $200 refundable deposit, credited to the pilot.
- **Kill signal on price:** if buyers will only pay under $50/month, they see it as a tool, and the free tools win.
- [fact] No vendor publishes a price for an independent agent-action record (searched 2026-10-05), so every number above is a test value.

### 11.5 Build plan: reuse / freeze / cut

The default for everything is **FREEZE**. "Reuse" applies only after stage D passes, and only if it fits the adopted recorder.

| Path | Verdict | Reason |
|---|---|---|
| `src/lib/jws.ts` | Freeze, conditional reuse | Zero-dependency Ed25519; 78 tests. Could sign packs as the attester. |
| `src/routes/verify.$agentId.tsx` (pattern) | Freeze, conditional reuse | The "verifier need not trust us" property |
| `agent_events` + `chain_event`, `actions.functions.ts` | Freeze | Chaining is not signing; Signet and halo-record do it |
| `src/lib/mandate*.ts`, migrations 0011/0012 | Freeze | Relevant to "authorised", and no gatekeeper has asked |
| `credential.ts`, `credential-status.ts`, `pop.ts`, `verifier.ts`, `/api/public/*`, `.well-known/*` | Freeze | Wedge a only; INFINITY-POP-v1 is non-standard |
| `issuer.server.ts` | Freeze; stop issuing in production | Provisional key mode |
| `src/lib/mcp*.ts`, `routes/mcp.ts` | Cut | Static clients cannot sign; no V1 use |
| `identity*.ts`, `identity-provider.server.ts`, `webhooks/didit.ts`, `OwnerAccountability.tsx` | Cut | KYC is out of V1; sandbox only |
| `key-lifecycle*.ts`, `AgentKeyLifecycle.tsx`, `recovery-confirm.$agentId.ts`, `20260930070000_agent_key_lifecycle.sql` | **Cut; never apply** | No relying party |
| Owner console `_authenticated/agents.*` | Freeze | Unenforced PERMISSIONS labels |
| `src/routes/index.tsx` | **Edit before archive:** remove the Email/Phone/Wallet/Insurance rows | Claims with no code |
| `waitlist.functions.ts` + migration | Freeze; read the count once | Unknown |
| `scripts/e2e-*.ts` | Freeze; keep the practice | Live-probe discipline |
| `coordination/`, `.kiro/`, DIRECTION.md | Freeze, plus one line: "Archived 2026-10-06" | Relay paused |
| README roadmap phases 2–5; AGENTS.md:62 RFC 9421 line; CA-economics rules | Delete or mark suspended | Unbacked or wedge-a only |
| Supaprod `runtime.server.ts`, write-once trigger, `audit-lineage.functions.ts` | Pattern only, after the V1 IP check | strategy-reset §13 |
| Supaprod process assets (locked predictions, kill criteria) | **Reuse now** | Used in this doc |

---

## 12. Kill criteria, and what makes the advisor say stop

**Kill (any one archives):**

| # | Criterion | Date |
|---|---|---|
| K1 | Zero (a)(b)(c) replies | 2026-10-10 |
| K2 | Fewer than 3 qualified deposits | 2026-10-15 |
| K3 | You take the lab track | 2026-10-16 |
| K4 | No gatekeeper has accepted a real pack | 2026-11-04 |
| K5 | Any gate deferred without a written stop date | Any time |
| K6 | Product code written before stage D passes | Any time |

**I would tell you to stop if:**
1. You restart an agent or write code before stage D passes. That would be the Supaprod and Infinity pattern a third time (R-14, Gate A).
2. The pass bar gets rewritten after the first message is sent.
3. A new framing appears mid-sprint ("what if we sell to insurers directly", "what if voice"). [fact] The thesis changed six times in 11 days.
4. Gatekeepers say Drata, Vanta or the Compliance API is enough, so P4 comes true and P3 does not. Then the acceptance gap does not exist.
5. Deployers pay only for approvals or kill switches. That market is priced by $0–39 tools.
6. The Intellect contract or a lab offer's IP clause reaches this work.
7. Founder-track hours exceed lab-track hours before 10-16, or "no energy, time, money" comes back.
8. Anything about Infinity goes public without your approval.

---

## 13. Top 3 questions you must answer before building

1. **If a frontier lab makes an offer by 2026-10-16, will you take it? And have you read the Intellect contract and the offer's IP-assignment clause?** If you would take it, this plan ends at stage G whatever the result. [unverified] Both contracts are unread.
2. **Will you sign today that a deferred gate counts as a failed gate, and that archive runs automatically on 2026-10-10 and 2026-10-15?** Seven deferred gates ([fact] repo; Gate A at DIRECTION.md:2221) say your commitment is the binding constraint, more than the market.
3. **If the only open business is hand-assembled audit evidence at about $1,500 per window for 10–80 person teams, sold through an auditor's referral, do you want it?** It is narrow and services-shaped at first, which are exactly the grounds on which you declined the finance pivot ([fact] R-42, 2026-09-23). If the answer is no, archive now and skip the sprint.

---

## Sources

**Repo documents** (read 2026-10-05; nothing modified; line references marked "re-checked" were verified against HEAD 22c412d on 2026-10-05)
- /home/user/project-infinity: README.md (L21–28, L50, L72–73), AGENTS.md (:62, re-checked), DIRECTION.md (§0–§22; L878, L887, L2152–2164, L2221 re-checked; 2,396 lines re-checked), MARKETPLACE-REVIEW.md, coordination/STATUS.md (2026-09-30), coordination/requests/20260930-0738, 20260930-1945, 20260930-2247, 20261001-2010, src/lib/pop.ts:15 (re-checked), src/routes/index.tsx:41 (re-checked), src/lib/jws.ts (309 lines, re-checked), src/lib/verifier.ts (230 lines, re-checked), supabase/migrations/ (13 files, re-checked), supabase/migrations/20260930070000_agent_key_lifecycle.sql (1,577 lines, re-checked), commit 22c412d (2026-10-01 20:22 IST, re-checked)
- /home/user/supaprod: docs/research/supaprod-internal-evidence-2026-09.md (2026-09-23); the-first-run/A1-REPORT.md (2026-09-02), ROOT-CAUSE.md, EVIDENCE.md, DIAGNOSIS.md, RULINGS.md; docs/AUDIT.md (2026-08-27); docs/pitch/yc/OUTCOME.md; docs/pitch/applications/README.md; docs/strategy/strategy-reset-2026-09.md; docs/strategy/direction-search-2026-09.md; docs/research/market-validation-2026-08.md; agentic-stack-and-absorption-2026-09.md; consumer-surface-and-agent-supply-side-2026-09.md; regulated-fs-agent-governance-2026-09.md; docs/prompts/strategy-reset.md; archive/v4-stress-test.md

**External** (date = publication date, or access date where noted; none re-fetched in the final review pass)
- https://pypi.org/pypi/hol-guard/json (accessed 2026-10-05)
- https://github.com/prismer-ai/signet (accessed 2026-10-05)
- https://github.com/bkuan001/halo-record (accessed 2026-10-05)
- https://claude.com/blog/compliance-api-cowork-and-claude-code (2026-08-11)
- https://claude.com/blog/auto-mode (2026-03-24; GA 2026-07-10)
- https://code.claude.com/docs/en/hooks (accessed 2026-10-05)
- https://code.claude.com/docs/en/remote-control (accessed 2026-10-05)
- https://developers.openai.com/codex/hooks (snippet, 2026-10-05)
- https://codex.danielvaughan.com/2026/04/15/codex-cli-hooks-complete-guide-events-policy-patterns/ (2026-04-15)
- https://drata.com/about/news/drata-extends-trust-management-platform-to-continuously-monitor-and-govern-ai-agents (2026-08-04, snippet)
- https://drata.com/blog/introducing-aiuc-1 (2026-07-16, snippet)
- https://runtimewire.com/article/vanta-agentic-trust-controls-ai-agent-governance (late Aug 2026, snippet)
- https://pushary.com/ (snippet, 2026-10-05)
- https://agentguard.run/blog/does-agentguard-bound-claude-code (snippet, 2026-10-05)
- https://pypi.org/pypi/agentguard47/json (2026-09-24)
- https://www.okta.com/newsroom/press-releases/ai-innovations-oktane-2026/ (2026-09-22)
- https://siliconangle.com/2026/09/22/okta-adds-ai-agent-runtime-gateway-forms-blueprint-alliance-with-aws-and-crowdstrike/ (2026-09-22)
- https://www.marketbeat.com/instant-alerts/okta-q4-earnings-call-highlights-2026-03-04/ (2026-03-04)
- https://usagepricing.com/blueprint/composio (accessed 2026-10-05)
- https://shopify.dev/changelog/bots-and-agents-should-identify-themselves-via-web-bot-auth (2026-05-07)
- https://www.searchenginejournal.com/shopify-extends-webmcp-into-checkout-for-browser-agents/591478/ (2026-09-28)
- https://shopify.dev/docs/agents/profiles/auth-and-rate-limiting
- https://www.contentgrip.com/shopify-muse-shop-pay/ (2026-09-21)
- https://www.streetinsider.com/Business+Wire/FIDO+Alliance+to+Develop+Standards+for+Trusted+AI+Agent+Interactions/26379456.html (2026-04-28)
- https://www.pymnts.com/mastercard/2026/mastercard-unveils-open-standard-to-verify-ai-agent-transactions/ (2026-03-05)
- https://developer.visa.com/capabilities/trusted-agent-protocol
- https://usa.visa.com/content/dam/VCOM/download/about-visa/visa-rules-public.pdf (2026-04-18)
- https://www.emarketer.com/content/american-express-agentic-commerce-developer-tools-purchase-protection (2026-04)
- https://docs.stripe.com/issuing/agents
- https://secure.businesswire.com/news/home/20260804228183/en/Cloudflare-Gives-AI-Agents-an-Identity-and-a-Wallet (2026-08-04)
- https://ramp.com/blog/ai-agent-spending-controls (2026-05-29)
- https://fintech.global/2026/09/23/baselayer-lands-35m-to-verify-ai-agents-before-fraud-hits/ (2026-09-23)
- https://pulse2.com/baselayer-raises-35-million-series-a/ (2026-09)
- https://www.experianplc.com/newsroom/press-releases/2026/experian-announces-agent-trust-to-power-trusted-ai-driven-commer (2026-04-30)
- https://www.nasdaq.com/press-release/akamai-unveils-agentic-security-framework-power-trusted-ai-driven-interactions-and (2026-06-16)
- https://www.digicert.com/jp/news/every-ai-agent-needs-a-kill-switch-digicert-launches-ai-trust-manager (GA date unverified)
- https://www.helpnetsecurity.com/2026/06/26/proofs-x401-establishes-an-open-protocol-for-ai-agent-identity-and-authorization/ (2026-06-26)
- https://businesswire.com/news/home/20260615464158/en/ (DataDome Forrester Wave, 2026-06-15)
- https://www.financialcontent.com/article/gnwcq-2026-9-16-pindrop-launches-pindrop-botstopper-technology-to-detect-ai-voice-agents-for-the-enterprise (2026-09-16)
- https://getcoai.com/news/googles-ai-assistant-now-makes-business-calls-for-users-nationwide/ (2026-05-19)
- https://www.wfmd.com/2026/10/03/ai-agents-can-now-make-phone-calls-for-you/ (2026-10-03)
- https://www.cp24.com/news/world/2026/09/22/meta-testing-a-human-concierge-for-its-new-personal-ai-agent-muse-reuters-exclusive/ (2026-09-22)
- https://www.techspot.com/news/113981-amazon-blocked-meta-muse-agentic-ai-shopping-service.html (2026-09)
- https://openai.com/index/devday-2026-recap/ (2026-09-29)
- https://thenextweb.com/news/openai-devday-pro-200-usage-cut-pro-500-plan (2026-09-29)
- https://pasqualepillitteri.it/en/news/19316/openai-launches-chatgpt-space (2026-09-29)
- https://theaiinsider.tech/2026/09/29/instinct-announces-1b-in-series-c-funding-from-sequoia-benchmark-and-coatue-at-10b-valuation/ (2026-09-29)
- https://techcommunity.microsoft.com/blog/agent-365-blog/whats-new-in-agent-365---september-2026/4560803 (2026-09)
- https://nvidianews.nvidia.com/news/open-agent-safety-platform (2026-09-28)
- https://linear.app/changelog/2026-03-24-introducing-linear-agent (2026-03-24)
- https://linear.app/changelog/2026-06-11-coding-sessions (2026-06-11)
- https://linear.app/changelog/2026-09-24-new-controls-for-linear-coding-agent (2026-09-24)
- https://smarterx.ai/smarterxblog/ai-agent-database-deletion (2026-04)
- https://decrypt.co/365897/ai-agent-deletes-startup-database-9-seconds-founder-says (2026-04)
- https://adtmag.com/articles/2026/07/22/openai-models-broke-out-of-test-sandbox.aspx (2026-07-22)
- https://accuroai.co/blog/ai-agent-incident-litigation-tracker (2026-08/09)
- https://techcrunch.com/2026/06/02/uber-caps-employee-ai-spending-after-blowing-through-budget-in-four-months/ (2026-06-02)
- https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/09/CSA_research_note_ai_agent_retail_skimming_campaign_20260924-csa-styled.pdf (2026-09-24)
- https://www.compliancepoint.com/regulations/aiuc-1/ (secondary)
- https://siliconangle.com/2026/09/15/ai-agent-certification-startup-aiuc-raises-40m-to-begin-auditing-frontier-models/ (2026-09-15)
- https://fintech.global/2026/02/12/elevenlabs-unveils-first-ai-insurance-for-voice-agents/ (2026-02-12)
- https://www.cdomagazine.tech/aiml/armilla-launches-first-of-its-kind-ai-liability-insurance-with-lloyds-backing
- https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force (2026-08)
- https://legiscan.com/CA/bill/AB410/2172
- https://www.medianama.com/2026/09/223-npci-ai-agents-upi-payments/ (2026-09)
- https://www.ainvest.com/news/x402-volume-93-ytd-agentic-ai-trade-depends-real-settlement-hype-2608/ (2026-08)
- https://github.com/Universal-Commerce-Protocol/ucp/discussions/864 (2026-09-25)
- https://www.opensourceforu.com/2026/02/github-weighs-pull-request-kill-switch-as-ai-slop-floods-open-source/ (2026-02)
- https://godotengine.org/article/contribution-policy-2026/ (2026-06-30)
- https://stripe.com/customers/fin-ai (accessed 2026-10-05)
- https://aimdoc.ai/blog/intercom-resolution-pricing-explained
- https://wisprflow.ai/post/series-b (2026-08-17)
- https://www.revenuecat.com/blog/growth/ai-app-retention-study (2026-03-10)
- https://www.mondaq.com/india/contract-of-employment/941370/indian-law-on-the-validity-of-trade-and-employment-restraints (2020)
- https://thenextweb.com/news/agentmail-raises-6m-seed-ai-agent-email-inboxes (date unverified)