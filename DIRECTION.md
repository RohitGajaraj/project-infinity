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


---

## 8. Direction change, 2026-09-29: the trust layer for every agent (supersedes §0 and §4)

> Founder decision: financial-services constraint (§14 c5) lifted; build agent infrastructure, horizontal by surface, phase by phase. Approved plan below, verbatim.

### Project Infinity: the trust layer for every agent

### 1. What it is
Every agent (Claude Code, Instinct, Muse, Wajo's Fo, or a company's own) connects to Infinity and gets what a person has: a verified ID tied to a real owner, its own email and phone number, a wallet with limits, a track record and insurance. Any business or app can check that ID before it deals with the agent.

We work in every industry and inside every app. We never build a "travel agent" or a "legal agent". We are the layer underneath all of them.

### 2. Positioning: why Muse or Instinct can't copy us
The risk you raised: if Muse or Instinct build these features themselves, do we become obsolete? Here is why that doesn't happen, and how we stay ahead.

1. **Neutrality is the product.** Instinct can give its own agents an ID, but a bank, airline or shop won't trust an ID issued by the agent's own maker, any more than it trusts a passport someone printed at home. It will trust an independent party that checks agents from every company. Muse and Instinct are competitors, so neither can be that party for the other. Only a neutral layer can be. This is how Visa and Stripe became standards instead of any single bank.
2. **They become customers, not rivals.** Wajo already had to build single-use cards, its own email, a password vault and human backup. Every agent company rebuilds the same plumbing. We sell it once to all of them.
3. **The track record builds over time.** Every agent action through us adds to a history across companies. Insurance, trust scores and fraud detection depend on it. A newcomer, or one company that only sees its own agents, cannot recreate it.
4. **Two-sided network.** The more businesses check Infinity IDs, the more agents need one, and the other way round. Being first in one high-value place (email and phone checks) starts that loop.
5. **Built on open standards.** We use open formats (MCP for agent add-ons, signed credentials for IDs), so adopting us costs nothing. We don't compete on the format itself; we compete on being the trusted issuer, and on the history behind each ID.

**The one-line pitch:** *"The passport, bank account and phone line for AI agents, trusted by every business because we don't make agents."*

### 3. Where it lives: keep it simple
Wajo runs on iMessage and Muse on WhatsApp because those are consumer assistants. We are infrastructure, so our "surface" is wherever agents already run:
- **For developers:** one add-on (MCP) plus an API. Any agent gets its ID, email, phone and wallet in minutes.
- **For owners:** a clean web console to create agents, set limits, approve actions and hit the off switch. Approvals also arrive by push, SMS or WhatsApp.
- **For businesses:** a public "Verify agent" page and a one-line check they can add to their checkout, phone line or inbox.
No mobile app in phase 1; the web console works well on phones.

### 4. How it works (the questions you asked)
- **Bringing in an outside agent:** the owner clicks "Add agent", picks the source (Claude Code, OpenAI, custom...), and gets an Agent ID plus a secret key. The agent installs our add-on and can then prove who it is.
- **Tying the ID to a real person:** the owner passes a one-time identity check, like opening a bank account (through a provider such as Stripe Identity or Persona). Every agent points to that verified owner, who is responsible for it the way you are for your car.
- **Making it checkable:** each agent has its own digital signing key. Every email, call and payment carries a signature anyone can check on our Verify page, without trusting the agent's maker.
- **Wallet:** held by a licensed partner (Stripe Issuing, or a stablecoin wallet). The agent gets a virtual card. Every payment is checked against the owner's limits, and anything larger waits for approval.
- **Insurance:** we're the broker, not the insurer. At first, small refunds come from a reserve funded by a fee on each transaction. Later, an insurance partner writes the policies, priced from the track record. Claims are settled using our signed receipts.
- **Email and phone:** inboxes on our domain and numbers from Twilio, both limited by the owner's settings, and marked "verified agent for [owner]".

### 5. Phases (one at a time; each must work before the next starts)
| Phase | What ships | How we know it works |
|---|---|---|
| **1. ID + Verify** | Owner sign-up, "Add agent", Agent ID and keys, owner limits, public Verify page, signed activity log, off switch | 10 outside agents onboarded; businesses successfully check IDs |
| 2. Email | Each agent gets its own inbox, with every email signed | Agents send and receive real email |
| 3. Phone | Numbers, SMS and calls | Agent calls a business and passes verification |
| 4. Wallet | Virtual cards with limits and owner approval | First real payments |
| 5. Track record + insurance | Trust score, refund reserve, then an insurance partner | First claim paid |

**This build is phase 1 only.**

### 6. Phase 1 screens
1. **Home page:** the one-line pitch, how it works in three steps, the add-on in a code box, and a waitlist.
2. **Sign in and owner verification** (identity check as a placeholder step for now).
3. **Agents console:** list of agents, each showing its status, source and last activity.
4. **Add agent:** pick a source, name it, set limits (allowed actions, spending cap, when to ask for approval, expiry date), then receive the Agent ID and a one-time secret key.
5. **Agent detail:** ID card view, limits, signed activity log, and a large off switch.
6. **Public Verify page (`/verify/<id>`):** shows valid, frozen or unknown, the verified owner, the limits, and when it was issued. It is shareable and the design is the showpiece.

### 7. Design direction
A premium, calm feel like what Anthropic, OpenAI or Google ship: a warm near-white background with near-black text, one restrained accent color, and plenty of space. A refined serif for headlines (such as Instrument Serif), a clean sans for text (such as Geist), and a monospace font for IDs and keys. Thin dividers, hardly any shadows, subtle motion. The ID card and Verify page are designed to feel like a real passport. Dark mode included. Before building, I'll show you three rendered design options to pick from.

### 8. Technical details
- Sign-in and data use your own Supabase project, connected in Project Settings → Connectors. It must be connected before phase 1 is built.
- Tables: `owners`, `agents`, `agent_keys` (public key only), `mandates`, `events` (hash-chained and signed), plus `user_roles` in its own table. Every table gets GRANTs and row-level security.
- Routes: `/`, `/auth`, `/_authenticated/agents`, `/_authenticated/agents/new`, `/_authenticated/agents/$id`, public `/verify/$agentId`, `/api/public/verify/$agentId` (JSON), and the MCP add-on at `/mcp` with the tools `whoami`, `get_limits` and `sign_action`.
- Ed25519 keys are generated in the browser. The private key is shown once, and only the public key is stored.
- I'll update DIRECTION.md and README.md to record this change of direction (no new docs).

---

## 9. Phase 1 gap analysis, 2026-09-29 (after commit `7884d1b` "Completed phase 1 build")

> Written after reading every source file, running typecheck and build, and **probing the live
> database** rather than reading code for it. Supaprod's finding of 2026-08-02 is the reason for that
> order: nine shipped features were found doing nothing in production, none by reading code.

### What is genuinely solid

- `bunx tsc --noEmit` clean; `bun run build` succeeds to a Cloudflare Worker.
- **RLS verified live, not assumed.** Anon `INSERT` into `agents` is rejected (`42501`), anon `SELECT`
  on `agents` / `profiles` / `agent_events` returns no rows, and `verify_agent` is callable by anon.
- Ed25519 keypair is generated with WebCrypto in the browser; only the public key is persisted
  (`src/lib/keys.ts`). This matches the claim in AGENTS.md.
- `agent_events` carries `prev_hash` / `hash`. The public JSON endpoint works and sets CORS.
- The design is premium and close to the brief's intent. This part is not the problem.

### The critical gaps, all of one kind: claims the code cannot back

| # | Gap | Why it matters |
| --- | --- | --- |
| **G1** | **The "signed activity log" is not signed.** It is hash-chained. Chaining proves the sequence was not edited *if you trust the database*; it does not establish who wrote an entry. And because the chain is computed by a DB trigger, the operator can recompute the whole chain and it still validates | Tamper-evident against a careless editor, not against us. For a neutrality product that distinction **is** the product. The UI asserts "Signed activity log" |
| **G2** | **The Ed25519 keypair is decorative.** Nothing verifies a signature anywhere. No `sign_action`. The secret is generated, shown once, never used by any code path | "Every action carries a signature anyone can check" is currently false |
| **G3** | **No Infinity credential, no Infinity signing key, no published JWKS, no offline verification.** A business "verifies" by querying our database and trusting the reply | This is the posture we say makes a maker-issued ID untrustworthy. **The neutrality claim has no cryptographic backing.** §7.6 of the brief promises exactly this and it is absent. Highest-priority item |
| **G4** | **`profiles.identity_verified` is a boolean with no flow to set it**, not even a placeholder interface | Every agent reads "identity check pending"; "tied to a real, accountable human" is unbacked |
| **G5** | **No machine surface at all:** no `/mcp`, no OpenAPI, no `llms.txt`, no SDK, no typed error codes | §4 says agents are the *main* users. An agent cannot currently interact with Infinity in any way. Phase 1 today serves humans only |
| **G6** | **`supabase/migrations/` does not exist.** Zero SQL in the repo; RLS policies, the `chain_event` trigger and the `verify_agent` body are unreadable to us and to any auditor | Contradicts the product's own auditability claim and blocks the stated export-to-self-owned-Supabase goal |
| **G7** | **No `user_roles` table**, though AGENTS.md and the brief §9 mandate it | Either implement it or delete the rule. An unmet stated rule is worse than no rule |
| **G8** | **`owner_id` is passed explicitly by the client** on insert (`agents.new.tsx`). Unverified whether RLS forces `owner_id = auth.uid()` | If not forced, a signed-in user can issue an agent owned by someone else. Must be confirmed against the live policy |
| **G9** | **`/verify/inf_7Q2K-9XRM-4LTB` returns a hardcoded "valid" verdict from the real verification route** | A verification service that answers "verified" for a fabricated ID inverts its own trust claim |
| **G10** | Waitlist form discards the email (`setJoined(true)`, no persistence) | The one element on the site that would produce market contact is a no-op |
| **G11** | 346 lint errors (345 prettier, 1 `prefer-const`); **zero tests**, including on key generation, chain integrity and verification | The repo cannot pass its own gate, and the crypto is untested |
| **G12** | README had already rotted: header said phase 1 in progress, body said "nothing is built" and described the superseded direction | Doc rot inside six days. Fixed in this pass |

### Two corrections to the plan itself

**C1. The phase-1 success metric measures the wrong side.** The approved test is "10 outside agents
onboarded; businesses check IDs." [`MARKETPLACE-REVIEW.md`](./MARKETPLACE-REVIEW.md) §6 already
established that in this market supply is oversupplied and near-worthless while demand is scarce, and
there is currently no reason for a business to check an ID. Ten onboarded agents therefore produce ten
IDs nobody queries. **Proposed: phase 1 is done when one business performs a real verification check in
a real flow.** Harder, and the only version that is falsifiable.

**C2. Signed credentials are phase 1, not step 3 of it.** Agent identity is a consolidating category
(Okta/Auth0 for agents, Cloudflare Web Bot Auth, Visa and Mastercard agent protocols, the 11-company
ARD coalition of 2026-06-17). Neutrality is the correct answer to all of it, and it is the same
independence thread that survived every prior analysis in this file. But neutrality is only defensible
if verification works **without trusting us**. So the offline-verifiable signed credential is the core
of phase 1. **The credential is the product; the console is packaging.**

### Build order to make Agent ID actually solid, before any other vertical

1. **Infinity signing key + signed credential + published JWKS + offline verification.** Closes G3, and
   makes the neutrality claim true rather than asserted.
2. **Real agent-side signing:** `sign_action` verifying the agent's Ed25519 signature server-side, and
   co-signing entries into the log. Closes G2, and downgrades G1 from false claim to honest guarantee.
3. **MCP server at `/mcp`** (`whoami`, `get_limits`, `sign_action`, `request_approval`, `verify_agent`)
   plus OpenAPI, `llms.txt` and an SDK snippet. Closes G5.
4. **Owner identity behind a clean interface**, provider-swappable, placeholder implementation. Closes G4.
5. **Schema into `supabase/migrations/`**, confirm the `owner_id` policy, settle `user_roles`. Closes G6–G8.
6. **Honesty and hygiene:** mark or remove the fake sample, persist the waitlist, fix lint, test the
   crypto paths. Closes G9–G11.

---

## 10. Who the customer is, and how verification actually works, 2026-09-29

> Founder question: *is this B2B, B2B2C or B2C — and concretely, when an Instinct or
> Muse agent makes a reservation, how does the business verify it, two-way, in a fraction of a
> second?* This section is the answer and it is binding. It exists so we stop drifting between
> audiences mid-build, which is how the previous project restated its problem five times in ten weeks.

### 10.1 The answer: B2B2C, on certificate-authority economics

**We sell to whoever is accountable for the agent. Verification is free, unmetered and
zero-integration for the business checking it.** Forever, not as an introductory offer.

That single asymmetry decides almost every other design question, and it is not novel — it is how
every trust layer that ever reached scale was priced:

| Trust layer | Who pays | Who checks | Cost to the checker |
| --- | --- | --- | --- |
| TLS certificates | The website | Every browser | Free, built in |
| DKIM / SPF / DMARC | The sender | Every receiving mail server | Free |
| Visa / Mastercard | Acquirer and issuer, per transaction | The merchant | No subscription to "check a card" |
| App notarisation | The developer | Every user | Free |
| **Infinity** | **The accountable party behind the agent** | **Every business** | **Free** |

**[INFERENCE]** The reason is structural, not generous. A trust layer's value is the *breadth of
places its credential is accepted*. Charging the verifier taxes the exact behaviour the network needs,
and the verifier's pain is probabilistic — nobody has a budget line called "agent verification" yet,
whereas the agent's side has an immediate, concrete problem: **its agent gets blocked and the product
fails.** Pain that blocks a product converts; pain that might cost you later does not.

### 10.2 So who is the customer, precisely

**The customer is the accountable party.** Same product, same credential, two billing relationships:

- **B2B (first, and where the revenue is):** an agent platform — Instinct, Muse, Wajo, or a company
  running its own fleet — pays per agent or per active mandate so its agents are accepted everywhere.
  They buy fast because they are already rebuilding this plumbing themselves, and they buy in volume
  because they have thousands of agents. This is also the answer to "isn't this a feature they'd
  build?": they can build an ID, but they cannot build *neutrality*, and a bank will not accept an ID
  the agent's own maker issued. See §8.2.
- **B2C (second):** an individual pays for their own agent's passport. Covered in §10.6.
- **Never the verifier.** A business pays nothing, signs nothing, and integrates nothing paid.

### 10.3 The three situations a verifier is actually in

Conflating these is the main design error available to us, so they are named separately.

**A. Passive check — "is this agent real, whose is it, what may it do?"**
Already built. The agent presents its credential; the business verifies the signature offline against
`/.well-known/jwks.json` and makes one live call to `/api/public/status/{id}`. Sub-second, and the
signature check needs no network at all after the key set is cached.

**B. Proof of possession — "is the presenter actually this agent?"**
**This is the gap that matters most, and it is not yet built.** A credential on its own is a bearer
token: anything that copies it can present it. The agent must prove it holds the private key whose
public half is *inside* the signed credential. That is what the agent's Ed25519 keypair is for, and
it is currently decorative (§9 G2).

**C. Approval — "may it do this specific thing?"**
Separate from identity. Handled by the mandate, and by a human when the mandate says so (§10.5).

### 10.4 The handshake, concretely

Designed to ride existing standards rather than invent a format, because neutrality means being
adoptable without adopting us: **HTTP Message Signatures (RFC 9421)** for the signing envelope,
proof-of-possession in the DPoP style, and compatibility with **Web Bot Auth**, which exists because
sites already want to tell good agents from bad ones.

```
  AGENT                                         BUSINESS
    |                                              |
    |-- 1. request + Agent-Credential: <vc+jwt> -->|
    |                                              |  verify signature offline
    |                                              |  against cached JWKS        ~0 ms
    |<-- 2. 401 + Agent-Challenge: <nonce> --------|
    |                                              |
    |   sign(nonce ‖ method ‖ url ‖ body-hash)     |
    |   with the agent's own Ed25519 key           |
    |                                              |
    |-- 3. retry + Signature: <sig> -------------->|
    |                                              |  verify sig against the
    |                                              |  publicKey INSIDE the
    |                                              |  credential                 ~0 ms
    |                                              |
    |                                              |  one status call            ~30-50 ms
    |                                              |  GET /api/public/status/{id}
    |<-- 4. 200 proceed ---------------------------|
```

**Why this is genuinely two-way:** the business proves nothing about itself in step 1–4 — but it
learns three independent facts without trusting us on any of them except liveness. The signature
proves *we* issued the mandate. The challenge response proves *the agent holds the key we named*. Only
"has the owner switched it off since?" requires a call to us, because no signature can express a
future revocation. **That single unavoidable call is the whole of our lock-in, and it is honest.**

**Latency budget:** one cached key-set fetch amortised to zero, two local signature verifications, one
status call. The status endpoint is the only thing on the hot path, so it stays tiny, uncached-by-us
but `stale-while-revalidate`-able by the verifier for a few seconds. A verifier who accepts a 5-second
staleness window can operate at zero added latency.

**The nonce must be single-use**, stored against the agent, or step 3 is replayable. That is a
migration and a `sign_action` requirement, not an afterthought.

### 10.5 Verification is not authorization, and only one of them can be instant

**[DECISION]** The protocol separates them, because a human cannot answer in a fraction of a second.

- **Inside the mandate** → instant. The mandate *is* a pre-authorization, exactly like a card's limit.
  "Book up to $200, ask above $50" means a $40 booking needs no human, ever. This is why most
  interactions are sub-second, and it is the reason the mandate belongs in the signed credential
  rather than in a lookup.
- **Outside the mandate** → the agent calls `request_approval`, the owner is asked by push, SMS or
  WhatsApp, and the business is handed a **signed approval receipt** naming that specific action.
  Seconds to minutes, and the business is told to expect a wait rather than being left hanging.

**[INFERENCE]** The second path is where the defensibility compounds. Anyone can check a signature;
only the party holding the owner relationship can get a human decision in seconds and put a signature
on the answer. That receipt is also what settles a dispute later, and what an insurer prices against
in phase 5.

### 10.6 B2C: what a consumer actually buys

A consumer does not want an identity product, and will not pay for one. What they will pay for is
**a hard limit and an off switch on something that spends their money** — identity is the mechanism,
safety is the purchase.

- **The surface is one connection, not an app.** Their agent is Claude, ChatGPT, Instinct or Muse, so
  the consumer adds Infinity as an MCP connection, passes one identity check, and sets limits. Thin
  surface, heavy machinery behind it — the shape §0 was pointing at.
- **What they get:** their agent can complete transactions that would otherwise be refused; a spend
  ceiling the agent cannot exceed even if it malfunctions or is manipulated; an instant freeze; and
  receipts that give them recourse when it gets something wrong.
- **[ASSUMPTION, untested]** Consumer conversion is *downstream* of businesses checking. Nobody buys a
  passport for a border that waves everyone through. So B2C is sequenced after at least one verifier
  category checks routinely — attempting it first would be selling insurance against a risk the
  customer has not met yet.

### 10.7 Sequencing, and the correction to who the first verifier is

**[CORRECTION to the mental model]** The restaurant-reservation example is the eventual story, not the
first one. A restaurant has no API, no fraud budget, and no idea what an agent is. The realistic first
verifier is **a website or API already receiving agent traffic that it currently cannot classify** —
which is precisely the problem Cloudflare's Web Bot Auth was built for. Those operators already have
the pain, already have the integration point, and already have a reason to allow good agents rather
than block everything.

So the order is:

1. **Proof of possession + `sign_action` + the MCP surface.** Makes the credential non-bearer and
   makes agents able to use us at all. Phase 1 is not done without it.
2. **A drop-in verifier**: one function, one file, no account, no key, no rate limit. Its adoption
   cost must be lower than the cost of thinking about it.
3. **One design-partner platform** with agents that are getting blocked, paying per agent.
4. **One verifier category** checking routinely.
5. **Then** consumer.

**Revised phase-1 done test**, replacing §9 C1 with something sharper: **one business completes the
full handshake — credential, challenge, proof of possession, status — against an agent it does not
own, in under a second, in its own codebase.** That is falsifiable, it is a single afternoon for the
verifier, and it cannot be faked by onboarding agents nobody checks.

### 10.8 What could make this wrong

Recorded now so it is not rationalised away later.

- **[RISK]** Businesses currently want to *block* agents, not verify them. If the defensive framing
  ("tell good agents from fraud") converts and the enabling framing ("accept agents safely") does not,
  the first product is a bot-classification tool with an identity layer underneath, and the positioning
  has to follow the money. Watch which framing the first five conversations respond to.
- **[RISK]** Cloudflare sits in front of a large share of the internet and could make agent identity a
  checkbox. That is absorption risk of exactly the kind that killed the previous project. Our answer is
  the part they will not do: the **accountable owner**, the **mandate**, and the **human approval
  receipt**. Cloudflare can tell a site that a request came from a known agent. It cannot say who is
  liable for it or that a person approved it. Stay on that ground and treat bot-auth as a rail to ride.
- **[RISK]** If the free-verification side never reaches density, the paying side has nothing to buy.
  This is the two-sided cold start that `MARKETPLACE-REVIEW.md` §6 warned about, and it is the single
  most likely way this fails. The mitigation is that verification must be *free and one file*, and that
  we go first in one high-traffic place rather than everywhere.
