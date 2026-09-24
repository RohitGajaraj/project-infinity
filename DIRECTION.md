# What to build next, and the 14 days that prove it

> _Written 2026-09-24. Inputs: Supaprod's `docs/strategy/strategy-reset-2026-09.md` (§14, ruling R-42),
> `docs/research/agentic-stack-and-absorption-2026-09.md`, the YC Fall 2026 RFS, and eight live
> competitive searches run today. Every dated claim below carries its source inline._

## 0. The one-line answer

**Build independent verification of finished work, as a self-serve product anyone can use on any
document, in any industry.** You drop in an artifact plus its sources. You get back every claim and
number marked verified / unsupported / contradicted, pointed at the exact source span, plus a link
the recipient can open. One surface. Heavy machinery behind it. Works on a contract, a deck, a
campaign claim, a compliance report, a research memo, an invoice reconciliation.

**Why this and not the other twelve things:** it is the only candidate I tested that passes all eight
filters in §2, and it is the one idea Supaprod got *right* — expressed in the one shape the ruling
allows.

---

## 1. What killed Supaprod, stated so we do not rebuild it

From the reset doc, not from memory:

- **Right problem, wrong buyer.** A PM's tool budget is $15–50/seat and the platforms they already
  pay for bundled the feature (Linear Agent, Atlassian Product Collection, Anthropic's free PM plugin).
- **No distribution mechanic anywhere in the product.** Zero organic external users after three months.
  0 of 25 outreach messages sent. Nothing in the artifact pulled a second person in.
- **Building was substituted for evidence.** 630k lines, 5,000 commits, 2,246 source files, 961 test
  files → one finished run, about the product's own paperwork.
- **It was a platform sale from a solo founder.** "Adopt seven stations" is a sale nobody makes.

**The one idea that survived the post-mortem**, quoted from §0.2: *an independent party checks work
it did not produce, against an expectation recorded before the outcome was known.* The ruling
rejected the **finance / services expression** of that idea. It did not reject the idea.

---

## 2. The filter every candidate has to pass

Constraints 1–7 are the founder's, from §14. T5 and T4 are mine, derived from the failure above.

| # | Test | Why it is on the list |
| --- | --- | --- |
| T1 | **A better frontier model makes it more valuable, not less** | §14 constraint 1. This is the test Supaprod failed twice |
| T2 | **One primitive, every industry** — horizontal, verticals are libraries not products | §14 constraints 2 and 4 |
| T3 | **Thin surface, heavy background** | The Wispr Flow shape. Also the only shape a solo founder ships |
| T4 | **Distribution lives inside the artifact** — using it exposes a second person to it | Supaprod's fatal gap. Non-negotiable |
| T5 | **Falsifiable in 14 days by strangers, not by code** | Your constraint. Also the cure for the 630k lines |
| T6 | **Compounds into an asset the labs cannot collect** | §14's stated open tension: protection must come from data, network, or distribution |
| T7 | **Product margins, not services** | §14 constraint 3 |
| T8 | **Not on the avoid list, not financial-services AI** | §14 constraint 5 + the research's own "categories to avoid" |

---

## 3. What I ruled out today, with evidence

These are worth recording so nobody proposes them again in three weeks.

| Candidate | Verdict | Evidence |
| --- | --- | --- |
| **Demonstration → reusable agent skill** ("show it once, it repeats") | **Dead. Absorbed.** | OpenAI shipped Codex Record & Replay on 2026-06-18 ([digitalapplied](https://www.digitalapplied.com/blog/openai-codex-record-replay-no-code-agent-skills-guide)); Anthropic shipped Record a Skill in Claude Cowork on 2026-07-21 ([digitalapplied](https://www.digitalapplied.com/blog/claude-record-a-skill-train-agents-by-demonstration-2026)). Fails T1 the exact way Supaprod did |
| **Multiplayer / shared agent sessions** (YC RFS asks for it) | **Crowded, and partly absorbed.** | Mosaic is YC-funded and explicitly positioned as "defining the frontier of multiplayer AI" ([YC](https://www.ycombinator.com/companies/mosaic-inc)); also Superconductor, Amoeba, Warp session sharing, plus OpenAI workspace agents and Copilot agent sharing. Dev-centric, so it also fails T2 |
| **Proof-of-personhood network** (YC RFS trust layer) | **Wrong shape for you.** Re-examined in full on 2026-09-24 → **§3.1**, same verdict, better reasons | World Foundation raised $52.5M on 2026-07-24 ([TechCrunch](https://techcrunch.com/2026/07/24/sam-altmans-biometric-startup-world-raises-52-5-million-via-crypto-sale/)); Self, VeryAI ($10M), EarnOS ($18.5M) funded. Hardware- and token-anchored, capital-intensive network effect. Fails T5 |
| **Small-software deploy/share cloud** (YC RFS) | **Absorption risk too high.** | It is the roadmap of Lovable, Replit, Vercel and Cloudflare — including the vendor you deploy on. Infra capital. Fails T1 and T6 |
| **AI-native compliance infrastructure** (YC RFS) | **Excluded.** | §14 constraint 5 (correlated with your former employer's domain) and constraint 4 |
| **Company brain / memory layer** | **Absorbed.** | Labs and hyperscalers ship memory and company knowledge; the research already lists it under avoid |
| **Deepfake interview verification** | **Strongest pain I found, kept as fallback.** Still the best of the trust-layer expressions — see **§3.1** | 38.5% of candidates flagged for AI-cheating across 19,368 live interviews Jul-2025→Jan-2026, tripling 9%→45% in one quarter ([Glozo](https://www.glozo.com/blog/deepfake-job-candidates)); 41% of orgs unknowingly hired a fake ([guard.io](https://guard.io/blog/deepfake-job-candidates-ai-fake-remote-interviews/)). But it is one narrow kind of work (T2), an arms race, and Metaview, Glozo, Fabric and GetReal are in it |

Content above was rephrased from the cited sources for licensing compliance.

### 3.1 The trust layer ("proving you're human"), evaluated in full

> _Added 2026-09-24, same day, after the YC RFS "Proving You're Human" brief was re-raised. Seven
> expressions of the idea were generated and scored. **Verdict: the market is real and large, every
> expression fails this repo's own filter, and the one thread that survives is already §4.** Recorded
> here so the space is closed with reasons rather than re-litigated in three weeks._

**The brief.** A finance worker joined a video call with his CFO and colleagues and wired out $25M;
every other participant was a deepfake (Arup, Hong Kong, Feb 2024). YC's framing: rebuild the trust
layer of the internet — a verified human on the other end of a call, a message, a transaction —
ideally without everyone surrendering their privacy.

#### The analytical correction that matters

"Proving you're human" is three separable problems, and the RFS framing blurs them:

1. **Personhood** — is there a live human here, not a synthetic puppet?
2. **Identity binding** — is it *this specific* human, the one I expect?
3. **Authority** — is that human permitted to do the thing being asked?

**Arup was not a personhood failure.** A "verified human" badge on every tile would not have stopped
it, because the attack impersonated *specific people holding specific authority*. Personhood alone
also fails against relay attacks, coerced approvers, and paid-human-front fraud — which is exactly
where attackers move the moment badges appear. Nearly every funded entrant sells (1) and markets it
as (3). That gap is the only interesting part of the space.

#### Landscape as of 2026-09-24 — the space got crowded in twelve months

| Layer | Who holds it | Evidence |
| --- | --- | --- |
| **Personhood on calls** | Zoom shipped **World ID Deep Face** into Meetings, Apr 2026 — Human Badge on the participant tile via a 3-way cryptographic face match, plus a "Deep Face waiting room" hosts can require | [Zoom newsroom](https://news.zoom.com/zoom-and-tools-for-humanity/), [TechCrunch 2026-04-17](https://techcrunch.com/2026/04/17/zoom-teams-up-with-world-to-verify-humans-in-meeting/), [world.org](https://world.org/solutions/world-id-for-zoom) |
| **Continuous identity + detection** | **GetReal Security** GA May 2026 across Zoom / Teams / Webex, positioned as no hardware, no wallet, no lock-in | [PRNewswire 2026-05-18](https://www.prnewswire.com/news-releases/getreal-security-launches-first-trust-and-authenticity-platform-that-combines-real-time-continuous-identity-verification-and-deepfake-detection-302773987.html) |
| **Detection (probabilistic)** | Reality Defender, Resemble AI, Netarx, Sensity, Pindrop — mostly single-modality | [Reality Defender](https://www.realitydefender.com/insights/best-deepfake-detection-tools-2026), [Resemble](https://www.resemble.ai/deepfake-detection-for-meetings/) |
| **New personhood entrants** | VeryAI $10M (palm scan, hardware-free), Moir reportedly raising ~$50M at $250M pre-product, Didit $7.5M seed, World Foundation $52.5M | [Finbold](https://finbold.com/veryai-raises-10m-to-launch-proof-of-reality-identity-verification-platform/), [BiometricUpdate](https://www.biometricupdate.com/202609/former-google-xai-staffer-seeks-50m-for-identity-startup-moir), [SiliconAngle](https://siliconangle.com/2026/05/26/didit-raises-6m-funding-build-ai-native-identity-infrastructure/) |
| **Bot / agent trust** | Cloudflare, DataDome. Bad-bot traffic **+124% YoY**, growing 9x faster than human traffic; AI agents made **605.6M requests to login, cart and payment flows in H1 2026**, 51.7% of it to login pages; 65% of tested sites wholly unprotected | [DataDome 2026-09-22](https://www.financialcontent.com/article/bizwire-2026-9-22-datadome-report-malicious-automated-traffic-is-growing-9x-faster-than-human-traffic-and-targeting-deeper-into-the-customer-journey), [SecureWorld](https://www.secureworld.io/industry-news/bad-bots-faster-than-human-traffic) |
| **Content provenance** | C2PA Content Credentials 2.3; OpenAI pushing conformance and cross-platform SynthID watermarking | [C2PA](https://c2pa.org/the-c2pa-launches-content-credentials-2-3-and-celebrates-5-years-of-impact-across-the-digital-ecosystem/), [OpenAI](https://openai.com/index/advancing-content-provenance/) |

**What is genuinely unbuilt:** the decision layer above all of these ("should I trust this interaction,
right now"), the authority binding, and the inverse problem of agent delegation.

#### The seven expressions, scored against §2

| # | Expression | Wedge | Verdict |
| --- | --- | --- | --- |
| 1 | **Authority-bound step-up at the moment of action** — verify the *named approver* against the *specific payload* inside the AP / treasury / wire-approval flow, and emit a signed, tamper-evident approval receipt | Strongest of the seven. Sells a control, not a detector; buyer is CFO **and** CISO, so two budgets; auditors and insurers pull it | **Fails T8** (§14 constraint 5 — payments/FS adjacency) and **fails T5** (ERP integration is not falsifiable in 14 days) |
| 2 | **Relationship-keyed verification** — pairwise device-bound keys between two parties who already know each other; no central biometric, no BIPA/GDPR honeypot, works on phone and email too | Targets the actual dollar loss: FBI logged ~$3.05B BEC losses in 2025, with AI-assisted deepfake involvement in BEC rising from <5% of incidents in 2023 toward ~40% by Q1 2026 ([beyondscale](https://beyondscale.tech/blog/deepfake-ceo-fraud-voice-cloning-defense-2026)) | **Fails T5.** Cold-start network; needs a hub (bank/insurer/large buyer) to onboard a vendor graph |
| 3 | **Agent attestation and delegation** — the inverse: a signed, scoped, revocable mandate proving an agent acts for an accountable principal within limits | Probably the largest ten-year position. Least crowded, standards still forming | **Fails T5 and T3.** Protocol + two-sided SDK play. Also directly in the path of OpenAI, Anthropic, Stripe, Visa/Mastercard |
| 4 | **Remote-hire / workforce identity continuity** — bind interviewee → offer → onboarding → device → the person still logging in on day 200 | Budget exists today; short sales cycle; ATS + IdP shaped | **Best of the seven, and already the §3 fallback.** Still **fails T2** (one narrow kind of work) and it is an arms race |
| 5 | **Inbound voice authenticity** for contact centres / RIAs | Highest attack frequency, existing budget line (voice biometrics) | **Fails T2.** Crowded by Pindrop, Resemble, Netarx |
| 6 | **Privacy-first consumer personhood** — unique-human tokens via ZK proofs over anchors people already hold (MNO subscriber attestation, bank account, gov eID, device attestation) instead of new biometric hardware | Real demand: Anthropic's Sep-2026 threat report described dating-app feeds running ~75% AI-generated profiles ([Morning Overview](https://morningoverview.com/thousands-of-ai-personas-posed-as-real-matches-on-20-dating-apps/)). MNO anchoring is the underrated path | **Fails T5 hard**, same as the original §3 ruling. Winner-take-most, capital-intensive, contested by World. Forcing function to watch: age-assurance regulation |
| 7 | **Orchestration + insurance layer** — a policy engine consuming World, GetReal, Pindrop, C2PA, device and behavioural signals → one assurance level + a defensible audit record, with an insurer underwriting against it | Converts a security purchase into a financial one and forces honesty about accuracy | **Closest to surviving**, and see §3.1's conclusion — it is §4's primitive wearing a different hat |

#### Market size, and why it is not the finding

- Gartner projects **half of global enterprises will be investing in anti-deepfake and disinformation-security tooling by 2027** ([CNBC-TV18](https://www.cnbctv18.com/technology/theres-a-lot-of-money-in-working-against-ai-too-19933715.htm)).
- Reported deepfake losses crossed **$1.5B in the first nine months of 2025** ([Veriff](https://www.veriff.com/fraud/deepfake-fraud-cost-2026)) and **$2B+** on a separate 2026 count, with 62% of organisations reporting at least one deepfake attack ([Netarx](https://www.netarx.com/blog/deepfake-statistics-2026)).
- Bottom-up: enterprise interaction-trust ≈ 150k organisations × $50–120k blended ACV ≈ **$7–18B addressable**; payment-authority binding prices in basis points against tens of trillions of B2B volume, so it has the highest ceiling; consumer personhood ≈ **$2–6B** at $0.10–0.50 per verification; agent attestation has no credible TAM yet, which is the point.

**[CAVEAT, and it is load-bearing.]** A large share of circulating deepfake statistics is unsourced and
recycled — one 2026 analysis of the figures makes exactly this complaint about billion-dollar loss
numbers with no primary source and four-digit surge percentages that contradict each other
([digitalapplied](https://www.digitalapplied.com/blog/deepfake-statistics-2026-fraud-detection-data)).
Do not build a deck on them. **And per §5, a TAM table was never Supaprod's missing input.**

#### Why the whole space is still closed for this repo

1. **T5 is the executioner.** Every high-ceiling expression needs an enterprise integration, a network, or a protocol coalition. None is falsifiable by strangers in 14 days. The two that *are* fast (hiring, voice) fail T2.
2. **T1 inverts on the detection half.** Generation improves faster than discrimination, so detection-based products decay as models improve — the structural critique World correctly levels at the detection vendors. Any durable build here must be attestation- and provenance-based, with ML detection strictly secondary.
3. **Distribution decides it, and it is already spoken for.** Zoom picked a partner in April 2026. Microsoft, Apple, Google, Okta and Cloudflare each have a credible path to bundling the primitive to zero. **A badge on a video tile is a feature, and platforms eat features.** This is the §3 "absorbed" pattern that killed Supaprod, arriving on schedule.
4. **Biometrics carry real regulatory drag** — Illinois BIPA, Texas CUBI, GDPR Art. 9, the EU AI Act. Avoiding central biometric storage is a commercial advantage, not only an ethical one, and it constrains architecture from day one.
5. **Verification concentrates risk.** The registry becomes the highest-value target on the internet, and enrolment fraud becomes the whole game — attackers stop faking the call and start faking the enrolment.

#### What survives, and where it goes

**The surviving thread is independence, not identity.** Expression 7 is the tell: what is missing from
the trust layer is not another signal, it is **an independent party willing to adjudicate and stand
behind a verdict** — the same property §4 identifies as the one thing generators structurally cannot
self-supply, and the same "referee, not marketplace" conclusion as `MARKETPLACE-REVIEW.md` §7. Person
provenance and claim provenance are one primitive seen from two ends. **§4 is the expression of it that
a solo founder can falsify in two weeks; this one is not.** No change to the plan in §5.

**What would reopen this:** (a) a regulatory mandate that forces verification into a workflow on a
deadline — age assurance is the likeliest trigger; (b) evidence that buyers will pay for *authority*
binding rather than personhood, which no incumbent currently sells; or (c) the §4 wedge passing its
14-day test and agent-output verification pulling us into attestation from the adjacent side, which is
the only path in that does not require abandoning the filter.

Content above was rephrased from the cited sources for licensing compliance.

---

## 4. The recommendation, scored against the filter

**Independent verification of finished work, self-serve, artifact-level, industry-agnostic.**

| Test | How it scores |
| --- | --- |
| T1 | **Passes hard.** Verification is adversarial to generation. More AI output → more to verify. Better models → cheaper verification and *more* volume needing it. A generator cannot credibly certify itself, which is the one property the research says labs structurally cannot absorb |
| T2 | **Passes.** Legal (citations, obligations), marketing (claims, substantiation), compliance (control evidence), finance ops (numbers vs source), consulting, research, grants, medical coding. Verticals are check libraries, not new products |
| T3 | **Passes.** One drop zone. Behind it: claim extraction, span-level retrieval, numeric reconciliation, contradiction detection, cross-model adjudication |
| T4 | **Passes, and this is the part Supaprod never had.** The verdict link travels outward with the artifact. Every recipient is an impression. Loom's and Figma's mechanic, not a referral program bolted on |
| T5 | **Passes.** §5's plan below kills or continues it in 14 days |
| T6 | **Passes.** The compounding asset is the corpus of *artifact → claim → source → verdict → what the human accepted or changed*, cross-vendor and cross-industry. Each lab sees only its own generations. Nobody else sees the accept/reject boundary |
| T7 | **Passes.** Self-serve on a document. This is the specific move that gets independence *without* becoming a services company — which is the tension §14 said the next direction had to resolve |
| T8 | **Passes.** Not code review, not PM tooling, not evals-for-developers, not identity, not FS |

**Competitive reality, honestly.** The concept is widely discussed and partially built. What exists:
legal-only citation checkers (Clearbrief, Paxton, NexLaw), developer-facing groundedness eval
tooling, DIY n8n/Exa demos, and one small horizontal entrant, [Recensa](https://recensa.ai/),
positioned as independent document assurance. No dominant horizontal owner, and the labs ship
"cite your sources" inside their own generation loop — which is self-certification, not independence.

**The honest kill reason.** People may accept slop. Word, Docs, Notion and Claude may bundle a
good-enough check. If the 14-day test shows nobody pays and nobody forwards the link, that is the
answer and it cost two weeks, not three months.

**The wedge for the first 14 days: numbers.** *Does every number in this document match its source?*
Binary, unambiguous, high-stakes, universal across industries, hated by humans, and models are
measurably bad at it. Do not build claim types 2 through 9 yet.

---

## 5. The 14 days

**Days 1–2: no code.** 30 messages and 5 calls to people who send out numbers they did not compute —
agency leads, consultants, in-house counsel, RevOps, grant writers, analysts. Ask what they last sent
out that had a wrong number in it, what happened, and who checked it. Do not describe the product.
Hand-make **three** verification reports by hand, on their real documents, and send them.

**Days 3–10: one surface, in this repo.** project-infinity is a clean Lovable TanStack Start scaffold
(two commits, empty `src/routes`), which is the right starting point. Build exactly:
upload artifact + sources → numeric claim extraction → span-level match → a single verdict page →
a public share link. No auth tiers, no workspaces, no seven stations, no design system project.

**Days 11–14: strangers.** Put it in front of people you have never met. Post the three hand-made
reports as the proof.

**What counts as evidence, decided now so it cannot be renegotiated later:**

| Signal | Kill | Continue |
| --- | --- | --- |
| People who ran a real document through it | < 15 | ≥ 25 |
| Paid, at any price, without a discount | 0 | ≥ 3 |
| Share links opened by someone who was not the uploader | < 10 | ≥ 20 |
| Second use by the same person within 7 days | < 20% | ≥ 40% |

**Locked predictions** (write these down before the test, grade them after — this is the one habit
worth carrying over from Supaprod): most documents will have at least one unsupported number; the
share link will drive more signups than any post; and the loudest requested feature will be a vertical
check library, not more claim types.

---

## 6. What to do with Supaprod

Leave it frozen, as §13 already ruled. Nothing in the 630k lines is needed for this. Two *patterns*
are worth re-reading when the time comes, not porting: the single model-call chokepoint with per-call
logging (`src/lib/ai/runtime.server.ts`), and the write-once verdict trigger. Not before the 14-day
test passes.

## 7. The rule for this repo

**Three documents — `README.md`, this one, and `MARKETPLACE-REVIEW.md` — and no fourth until there are
25 real users.** Extend one of them rather than adding a file. The failure mode is documented and
dated, and it is not code volume — it is building instead of finding out.
