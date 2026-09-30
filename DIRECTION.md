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
| ~~**G5**~~ | ~~**No machine surface at all**~~ — **CLOSED 2026-09-29.** `/mcp` serves five tools (`whoami`, `get_limits`, `get_credential`, `request_approval`, `verify_agent`) over JSON-RPC with bearer auth; a frozen agent is locked out with 403. Still open: OpenAPI, `llms.txt`, SDK | An agent can now use Infinity. Verified live in `bun run e2e` steps 9–9b |
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

> **[FACT, added 2026-09-29]** That last claim is no longer an inference. Amazon blocked Meta's Muse
> from its store on 2026-09-20 citing *identity concealment*, and businesses hang up on Muse's phone
> calls often enough that Meta now routes them to paid human agents. Evidence and sources: **§11.1**.

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

---

## 11. Evidence scan: Muse, Instinct, Wajo, and who else is in this space, 2026-09-29

> Founder steer: take references from Instinct, Muse and Wajo — their sites, press and user feedback.
> This section is the result. It **upgrades the core assumption of §10 to fact**, sharpens who the first
> verifier is, and records one direct competitor found in the process. Content rephrased from sources
> for licensing compliance.

### 11.1 The thesis is no longer an inference. Two named, dated events prove it.

§10.1 argued that the agent's side has the urgent pain because *its agent gets blocked and the product
fails.* That was labelled [INFERENCE]. It is now **[FACT]**, twice over, and both involve Meta's Muse
— the best-resourced consumer agent in existence, launched 2026-09-08.

**1. Amazon blocked Muse from its store on 2026-09-20, and the stated reasons are our product.**
Amazon said it was not told in advance, did not authorise the activity, and that **Muse does not
identify itself**, appears to capture and store customer credentials, and scrapes account data
([Business Insider](https://www.businessinsider.com/amazon-blocks-meta-muse-ai-agent-shopping-site-2026-9/),
[GeekWire](https://www.geekwire.com/2026/amazon-blocks-metas-muse-ai-assistant-in-new-standoff-over-agentic-shopping/)).
Forbes reported the objection as **unauthorised agent access, identity concealment and credential
collection**. This is the first time a major retailer treated a mainstream consumer agent as an
intruder. Amazon has been at this for a year: it sued Perplexity over Comet and moved to block Google's
and OpenAI's shopping agents.

**2. Businesses hang up on Muse's phone calls, and Meta's fix was to hire humans.** Internal testing
found companies ending calls once they realised an AI was on the line — one employee reported his
insurer kept hanging up on Muse. Meta's response was to route requests to **trained human agents who
place the call instead**
([technology.org](https://www.technology.org/2026/09/23/meta-muse-human-concierge-ai-phone-calls/)).
Wajo's Fo shows the same shape from the other side: 71% task completion, with **escalation to a human**
when it cannot finish ([KuCoin](https://www.kucoin.com/news/flash/former-google-deepmind-engineer-launches-ai-agent-fo-with-71-task-success-rate)).

**[INFERENCE] Meta is paying humans because it has no trust layer.** That is the cost of the missing
layer, quantified in headcount by the company least likely to be short of engineering. It is the
clearest demand signal in this file.

**Supporting context.** Consumer sentiment is actively hostile: preference for a human rose to 85%
against 5% for AI, and 31% say they would hang up if connected to AI
([PRNewswire](https://www.prnewswire.com/news-releases/ai-backlash-grows-across-us-uk-and-canada-more-customers-reject-bots-for-human-support-in-2026-302770476.html)).
**[INFERENCE]** This is why "hide that it's an agent" is a dead end and disclosure is the only durable
posture: the winning message is not *this is a human*, it is *this is an agent, acting for a named
accountable person, within these limits, and you can check it in one call.*

### 11.2 The decisive correction: Shopify said yes where Amazon said no

**[FACT]** The same week Amazon blocked Muse, **Shopify opened checkout to browser-based agents**
(2026-09-28), and both Muse and Instinct already hold **direct partnerships** with Shopify
([TechCrunch](https://techcrunch.com/2026/09/28/shopify-opens-checkout-to-browser-based-ai-agents/)).
Shopify reports AI-driven traffic up 8x year over year in Q1 2026 and orders from AI-powered search up
nearly 13x.

**[INFERENCE] This splits the verifier market cleanly, and it is the most useful targeting conclusion
in this file.**

| | Motive for blocking | Does a neutral credential help? |
| --- | --- | --- |
| **Amazon-class gatekeepers** | Commercial — they own the customer relationship and the ad revenue. Forbes framed it as a *$68B reason*, and noted Amazon invokes standards it does not apply to its own shopping agent | **No.** Identity was the stated reason, not the real one. Do not chase these |
| **Shopify-class merchants** (millions) | Trust and liability — they *want* the sale | **Yes.** This is the market |

**So do not sell to the gatekeepers.** Sell where the business wants the transaction and only needs to
know who is on the other end. The restaurant losing revenue to unanswered phones and the merchant who
wants the order are aligned with us; Amazon is not, and no amount of cryptography changes that.

### 11.3 But Shopify also shows the absorption risk, and where we fit inside it

**[FACT]** Shopify has shipped an **agent profile**: a JSON document by which *"your agent identifies
itself to merchants"*, declaring UCP version and capabilities
([shopify.dev](https://shopify.dev/docs/agents/get-started/profile)). It sits inside the **Universal
Commerce Protocol**, co-developed with Google and endorsed by 20+ retailers and platforms, alongside a
hosted MCP server and WebMCP. Shopify also pushed `llms.txt`, `agents.md` and agentic discovery to
every storefront around May 2026.

**[INFERENCE] Read this precisely, because it looks like our idea and is not.** The Shopify profile is
**self-declared**: it states what an agent *claims* about itself. It carries no independent issuer, no
KYC'd accountable owner, no signed mandate, and no revocation. It answers *what can this agent do?* and
leaves *who is liable if it goes wrong?* unanswered — which is exactly the gap Amazon named.

**Our slot is therefore inside UCP, not against it.** Infinity is the independent issuer whose
credential a UCP agent profile references. Competing with UCP would be the mistake the previous project
made: standing in front of a standard that platform owners have already agreed on.

**And the network argument is now concrete.** Muse↔Shopify and Instinct↔Shopify are **bilateral deals**.
Bilateral does not scale: *N* agent platforms × *M* merchant networks is N×M negotiations. A neutral
credential collapses that to **N + M**. That is the whole reason a neutral party exists, and it is now
observable rather than theoretical.

### 11.4 Competitor found: AliasKit, and it is close

**[FACT]** [AliasKit](https://www.aliaskit.com/) sells "digital identity for AI agents": a real email
inbox, phone number, virtual card and TOTP codes via one API call. It ships **DID:web documents,
Verifiable Credentials as VC-JWT, a public JWKS endpoint**, ES256/RS256 agent tokens, HMAC-signed
webhooks, per-organisation isolation, LangChain adapters, ERC-8004 on-chain linking, and a
**reputation score with bronze→platinum tiers driving allow / review / deny decisions**. Ten free
identities, five-minute setup.

**That overlaps phases 1 through 5 of our plan, including the credential format we just built and the
trust score we had scheduled for phase 5.** Recording that plainly rather than discovering it later.

**Where it is genuinely different, and where our position holds [INFERENCE]:**

- **They serve the agent; we serve the relationship.** Their framing is *"your agent operates on the
  internet like a human remote worker"* and their tooling is aimed at "teams shipping AI agents" —
  supply-side capability. Ours is aimed at making a *business* accept an agent.
- **Their reputation is self-issued.** AliasKit scores agents on activity AliasKit observes. That is a
  vendor grading its own customers, which is the same structural problem as a maker-issued ID (§8.2).
- **No accountable human.** An AliasKit identity belongs to an organisation's API key. Ours binds to a
  KYC'd person or company who is liable, which is what an insurer and a merchant actually need.
- **No mandate and no approval receipt.** Nothing in their surface pre-authorises a *specific* action
  or proves a human approved an exception. That is §10.5, and it is where our defensibility compounds.
- **Philosophical, and the market has already ruled on it.** "Operates like a human remote worker" and
  alias inboxes for signups is *blending in*. Amazon blocked Muse for **identity concealment**.
  Disclosure plus accountability is the side of this that regulators and merchants are moving toward.

**[RISK]** If they add an owner-KYC step and a verifier-side surface, the distinction narrows fast.
Speed on proof-of-possession and the mandate matters more than breadth of capabilities.

### 11.5 Other players, sorted so we do not mistake them for competitors

- **Enterprise agent IAM — crowded, different buyer.** Keycard ($38M, ephemeral task-scoped agent
  credentials), Aembit, WorkOS, Okta/Auth0 for agents. These secure *workloads inside a company*. They
  do not issue a credential a stranger accepts. Not our market, and consistent with the earlier ruling
  to avoid machine-identity consolidation.
- **Owner KYC — suppliers, not rivals.** Stripe Identity, Persona, Didit (~$0.30/check). We broker one
  of these for §9 G4; we never build it.
- **Bot classification — a rail to ride.** Cloudflare Web Bot Auth. Tells a site a request came from a
  known agent; cannot say who is liable or that a human approved it.

### 11.6 What this changes in the plan

1. **Keep the build order from §10.7.** Proof of possession is still next, and 11.1 makes it more
   urgent, not less: the reason Amazon gave was identity, and a self-declared profile does not answer it.
2. **Target Shopify-class merchants and the long tail, never Amazon-class gatekeepers** (11.2). Update
   any outreach list accordingly.
3. **Emit a UCP-compatible agent profile that references our credential** (11.3). Added to the phase-1
   remainder, after proof of possession. Ride the standard.
4. **Phone is higher-value than its phase-3 slot suggests** (11.1). The hang-up problem is documented
   and Meta is paying humans for it. Not reordering yet — Agent ID must be solid first, per the founder's
   one-thing-at-a-time rule — but the moment phase 1 closes, **phone should be reconsidered ahead of
   email**, because that is where the evidenced pain is.
5. **B2C messaging is confirmed by user reports.** Wired on Instinct: it saved $550, **wasted $64**, and
   "might be a security nightmare"; Instinct's inbox access is drawing privacy scrutiny. That is
   precisely the §10.6 purchase — a hard cap, an off switch, and receipts — described by a user in the
   wild rather than assumed by us.
6. **Do not lead with "identity."** Lead with the outcome: *your agent stops getting blocked*, or for
   consumers, *it cannot spend more than this and you can kill it instantly.*

---

## 12. Competitive due diligence, 2026-09-29 — and the finding that forces a decision

> Founder asked for a deep dive on AliasKit and on anyone else in this space, **before** more building.
> That was the right instinct and it caught something. **AliasKit is not the threat. Baselayer is, and
> our §10 positioning is now occupied by a funded company that announced seven days ago.** Read §12.3
> before writing any more code. Content rephrased from sources; every claim carries its date.

### 12.1 First, a factual correction

Amazon blocked **Muse, Meta's agent** — not Shopify. Shopify did the opposite and *opened* checkout to
browser-based agents on 2026-09-28. That distinction is the whole of §11.2: gatekeepers block for
commercial reasons a credential cannot fix, merchants block for trust reasons it can. Getting these two
the wrong way round would invert our targeting.

### 12.2 AliasKit: real, but early, indie, and not our competitor

**[FACT]** What the product does: persistent identity for an agent — real email inbox, phone number,
virtual card, TOTP codes, one API call. W3C DID:web, VC-JWT, public JWKS, ES256/RS256 tokens,
HMAC-signed webhooks, per-org isolation, LangChain adapters, ERC-8004 on-chain linking, bronze→platinum
reputation driving allow/review/deny. Card details are encrypted client-side — they state they never see
plaintext. Free tier of 10 identities, "5-minute setup". Distribution is through agent skill
directories (LobeHub, Skywork Skill Hub).

**[FACT] What I could not find, after targeted searching:** no funding announcement, no Crunchbase
raise, no press coverage, no Product Hunt launch, no Hacker News thread, no named founder, no company
address, no incorporation record, and a pricing page that is a single sentence with no numbers on it.

**[INFERENCE] Stage: pre-traction indie or very small team, self-funded, no institutional backing.**
The absence of all seven signals at once is itself the signal. A funded competitor in a hot category
does not go unreported.

**[INFERENCE] And they are solving a different problem.** Their framing is *"your agent operates on the
internet like a human remote worker"* — alias inboxes and cards so an agent can sign up for things and
check out. That is **capability for the agent**, i.e. helping it pass as an ordinary user. Ours is
**acceptance by a counterparty**. The reputation score is self-issued, which is the same structural flaw
as a maker-issued ID: a vendor grading its own customers. There is no KYC'd liable owner, no signed
mandate, and no human-approval receipt.

**Verdict: not a competitor to fear. A useful reference for phases 2–4** (agent inboxes, number
provisioning, client-side card encryption, ERC-8004 linking, skill-directory distribution). **Worth
copying:** their distribution channel. Publishing to agent skill directories is a real acquisition path
we had not considered.

### 12.3 Baselayer: this is the problem, and it is a direct hit

**[FACT, 2026-09-22]** Baselayer announced a **$35M Series A led by M13** (Torch Capital, Picus
Ventures, Afore Capital, and Matt Thompson of Socure) and launched its **Agentic Identity Suite**
([PRNewswire via AOL](https://www.aol.com/articles/baselayer-raises-35m-series-led-131500000.html),
[Finovate](https://finovate.com/baselayer-raises-35-million-for-its-agentic-identity-technology/),
[Crunchbase News](https://news.crunchbase.com/ai/verifying-ai-agents-baselayer-35m-raise/)).

- **What it does, in their words as reported:** the layer that lets **banks, merchants and platforms
  verify which AI agent they are dealing with, who it represents, and whether it is authorised to act**
  ([Yahoo Finance](https://finance.yahoo.com/technology/ai/articles/baselayer-raises-35m-build-know-134504151.html)).
  They call it **"Know Your Agent."**
- **Distribution they already hold:** an existing business-identity and fraud network **trusted by 1 in
  5 US financial institutions — 2,300 institutions**.
- **Based:** New York. **Stage:** Series A, product launched.

**Compare that to our own §10, written yesterday:** *"a verified identity tied to a real accountable
human or company… any business can check that identity in one call… verify which agent, who it acts
for, and what it may do."* **It is the same sentence.** Recording that plainly rather than discovering
it in three months.

**And they solve the failure mode we identified as most likely to kill us.** §10.8 and
`MARKETPLACE-REVIEW.md` §6 both said the two-sided cold start was the greatest risk: free verification
only works if verifier density arrives. **Baselayer starts with 2,300 verifiers already integrated.**
A solo founder cannot out-cold-start that.

**Their one weakness, and it is real but not ours to exploit:** *nobody is legally required to check yet*
([MSN](https://www.msn.com/en-us/money/technology/baselayer-raises-35m-to-build-ai-agent-identity-verification-no-law-yet-requires/ar-AA2cQfNP)).
They can fund an 18-month wait for regulation. We cannot.

### 12.4 The rest of the field, so the picture is complete

**[FACT] Agent identity attracted well over $200M of disclosed funding in roughly twelve months:**

| Player | Disclosed | Date | What it is |
| --- | --- | --- | --- |
| **Baselayer** | $35M Series A | 2026-09-22 | Know Your Agent for banks, merchants, platforms. **Our position** |
| **World AgentKit** (Altman-backed) | part of World's $52.5M | launched 2026-03-17 | Toolkit letting agents carry **cryptographic proof that a real, unique human stands behind them** — our accountable-owner claim, on a personhood network |
| NewCore | $66M seed | 2026-06-15 | Identities for agents "as employees"; authenticate, govern, control at scale |
| Oak | $60M seed | 2026-07-15 | Unified identity control plane, GA, enterprise customers |
| Keycard | $38M | 2025-10 | Ephemeral, task-scoped agent credentials |
| Rig Security | $12M seed | 2026-09-29 | Tel Aviv; AI identity risk |
| Scalekit | $5.5M seed | 2025-09 | Auth stack for agentic apps |

Context for scale: **Instinct raised $1B Series C at a $10B valuation on 2026-09-28**, having launched
invite-only in August 2026.

**[INFERENCE]** Three clusters, and only one collides with us. Enterprise agent IAM (NewCore, Oak,
Keycard, Scalekit, Rig) secures workloads *inside* one company and issues nothing a stranger accepts —
adjacent, not competing. World holds "a real human stands behind this agent" with a personhood network
we cannot replicate. **Baselayer holds the counterparty-verification layer, which is exactly what we
wrote down.**

### 12.5 What is genuinely still unsolved — and it is where our own evidence already pointed

Every player above is an **API for software talking to software**. Cross-reference that against the
strongest pain in §11.1 and a gap opens:

| Documented problem | Evidence | Who solves it today |
| --- | --- | --- |
| **Businesses hang up on agent phone calls** | Meta now pays trained humans to place Muse's calls (§11.1) | **Nobody.** There is no HTTP header on a voice call |
| Agent gets blocked at a merchant | Amazon vs Muse, 2026-09-20 | Baselayer (merchants), Shopify UCP profile (self-declared) |
| Agent moves money at a bank | — | Baselayer, with 2,300 institutions |
| Consumer agent overspends, no recourse | Wired on Instinct: saved $550, **wasted $64**, "might be a security nightmare" | **Nobody.** No cap, no off switch, no receipt |

**[FACT] STIR/SHAKEN does not close the phone gap.** It authenticates that a call genuinely originates
from the displayed number and that the signalling path was not tampered with. It **cannot confirm the
caller's identity or intent**
([First Orion](https://firstorion.com/blog/why-stir-shaken-cannot-stop-ai-voice-fraud-and-how-call-authentication-can)).
Branded Caller ID adds a verified *business* name — but it is built for a business calling a consumer,
requires direct registration with an FCC-licensed carrier, and suffers heavy carrier and device
fragmentation in 2026. **The inverse case — an agent calling a business on behalf of a named consumer —
is not covered by either.**

**[FACT] And disclosure is becoming law, which turns this from nice-to-have into obligation.** EU AI Act
**Article 50 transparency obligations became enforceable on 2026-08-02**: systems interacting directly
with people must disclose they are AI ([DCO](https://dco.org/dco-policy-tracker/)). California's bot
disclosure law (SB 1001) already requires a bot to identify itself in commercial interactions, its AI
Transparency Act is live with **$5,000-per-violation** penalties, and a further California bill would
require bots to disclose identity before interacting and to **answer truthfully when asked whether they
are a bot**.

**[INFERENCE] Put those together and the shape of the opportunity is:** agents are legally obliged to
disclose that they are agents, disclosure currently gets them hung up on, and no existing
infrastructure lets a disclosed agent be *trusted* on a voice channel. Compliance creates the
disclosure; nobody has built the trust that makes disclosure survivable.

### 12.6 The decision this forces, stated honestly

**Continuing to build a general "trust layer for every agent" is now building Baselayer's product with
none of Baselayer's distribution and none of its money.** That is the Supaprod pattern exactly: a
technically strong general platform, a correct thesis, and a better-positioned incumbent shipping it.
The founder's instruction — validate before building further — caught it in one day instead of three
months, which is the whole point of the §2 filter.

**What survives untouched.** Everything built so far is the *mechanism*, not the positioning: the
signed credential, offline verification, the published key set, proof of possession, the mandate, the
chained log, the drop-in verifier. All of it is reusable by any narrowing below. **No code is wasted;
the wrapper around it is what changes.**

**Three candidate narrowings, to be decided by the founder, not by me:**

1. **Verified agent voice calls.** The only evidenced pain with a named company already paying cash for
   a workaround, zero direct competitors, a legal tailwind from Article 50, and buyers we can name
   (Meta/Muse, Instinct, Wajo, plus every voice-agent startup). Uses the credential and mandate
   directly. **Strongest on evidence; unproven on whether a small business will check anything mid-call.**
2. **The consumer safety rail.** Hard spend cap, instant off switch, receipts and recourse for people
   running Instinct/Muse-class agents. Evidenced by real user reports, no direct competitor, and it is
   the §10.6 purchase. **Weakest on willingness to pay; strongest on being genuinely unoccupied.**
3. **Stay horizontal and accept the fight.** Only defensible if we can reach verifier density somewhere
   Baselayer is not, i.e. outside financial institutions. **Hardest, and the one I would argue against.**

**My recommendation: option 1, with option 2 as the consumer surface later.** But this is a direction
change, and §5 of the brief says a direction change waits for the founder. **No further feature work
until that call is made** — the next build would otherwise be a guess with a competitor already in it.

---

## 13. What we actually are: identity, or infrastructure? Decided 2026-09-29

> Founder's question, and it is the right one: *"Are we giving infra for agents, or identity for agents
> — email, phone, identity, cards, insurance?"* Plus two corrections to my §12 framing: the candidate
> directions should be folded into one build rather than chosen between, and **this is not a permanent
> solo-founder company** — funding and hiring are expected, so "cannot out-cold-start an incumbent" is
> a sequencing constraint, not a verdict.

### 13.1 The answer: identity is the wedge, infrastructure is the business

**We are the agent's operating identity and the rails it acts through. Verification is the free public
good that makes those rails acceptable to strangers.**

Said as one sentence: **Baselayer sells a *check* to the receiving institution. We issue the *identity
and the rails* to the accountable party, and let anyone check for free.**

| | **Baselayer** | **Infinity** |
| --- | --- | --- |
| Sells to | Banks, merchants, platforms — the receiver | The accountable party — agent platform or owner |
| Product | A risk API. "Should I trust this agent?" | An operating identity. "Here is my agent's number, inbox, card, mandate, receipts" |
| Revenue | Per check, to institutions | Per agent and per rail, to the agent's side |
| Closest analogue | Socure or Persona, for agents | Twilio + Stripe Issuing + a passport office, for agents |
| Owns a rail? | **No** — it is a data and risk layer | **Yes** — the number, the inbox, the card |
| Verification | The product | Free, permanently (§10.1) |

**[INFERENCE] Why that distinction is durable rather than semantic.** A risk API is bought by the
receiver and priced per query, so its moat is the receiver network — which is why 2,300 financial
institutions is Baselayer's real asset. Rails are bought by the actor and priced per unit of capability,
so the moat is the identity itself plus the switching cost of a number, an inbox and a payment
instrument the agent already operates under. **Those are two different companies that happen to share a
noun.** Baselayer will not provision phone numbers; a fraud-intelligence company does not become a
telco. And we should not try to become a fraud-intelligence company for banks — that is §14 constraint 5
of the original ruling anyway.

**So: identity is the wedge because it is what makes the rails trusted. The rails are the business
because they are what recurs.** Email, phone, card and insurance are revenue lines; the credential is
the thing that stops each one from being refused.

### 13.2 The four options were never a choice. They are one sequence.

The founder is right that §12.6 framed these as alternatives when they compose. Corrected:

| Option from §12.6 | Its real role |
| --- | --- |
| **Verified agent voice calls** | **The wedge.** Where the pain is proven and no competitor holds the rail |
| **Consumer safety rail** | **The consumer surface**, sold on safety, delivered on the same mandate and receipts |
| **Stay horizontal** | **The architecture, from day one.** The credential is already industry-agnostic; nothing about a voice wedge narrows it |
| Telecom authority | **A dependency of the wedge**, not a separate direction — see 13.4 |

Nothing is dropped. The horizontal trust layer stays exactly as built; we stop *leading* with it,
because leading with it is competing with a funded incumbent on their strongest ground.

### 13.3 Why voice is the wedge, argued rather than asserted

Five reasons, each tied to evidence already in this file.

1. **It is the only pain where a named company is already paying cash for a workaround.** Meta routes
   Muse's calls to trained humans because businesses hang up (§11.1). That is a budget line that exists
   today, held by a buyer we can name.
2. **No competitor is there.** Every player in §12.4 is an API for software talking to software. **There
   is no HTTP header on a voice call**, so a credential-over-HTTPS product does not reach it. STIR/SHAKEN
   authenticates the number and the signalling path but explicitly cannot confirm caller identity or
   intent; Branded Caller ID is built for a business calling a consumer and is carrier-fragmented (§12.5).
3. **It requires owning a rail, which is exactly what a risk API will not do.** Owning the number is
   what makes us infrastructure rather than a lookup, and it is the natural root of inbox, card and
   receipts.
4. **The cold start is far weaker than for API verification, which is the decisive practical point.**
   API verification needs the *business* to integrate something — that is the density problem Baselayer
   solves with 2,300 institutions and we cannot. **A phone call needs the business to integrate
   nothing.** The agent discloses itself and offers a way to check; a receptionist who does nothing at
   all still received a disclosure from an accountable party. Checking is optional and additive.
   **We can therefore deliver value with exactly one customer and zero verifiers**, which is the
   property every other option lacks.
5. **Disclosure is becoming compulsory, so the wedge rides law rather than persuasion.** EU AI Act
   Article 50 has been enforceable since 2026-08-02; California already requires bots to identify
   themselves in commercial interactions, with $5,000-per-violation penalties under its AI Transparency
   Act (§12.5). Agents *must* announce themselves. Announcing gets them hung up on. **Compliance creates
   the problem; nobody sells the cure.**

### 13.4 What the wedge actually is, concretely

Not "a phone product". **A verified, disclosed identity for an agent placing a call, and a receipt
afterwards.**

- A number provisioned per agent (or per platform), bound to the agent's credential and its KYC'd owner.
- A disclosure the agent speaks at the top of the call, naming what it is and who it acts for, which is
  what Article 50 requires anyway.
- A **spoken short code** the business can optionally check — the reason §12's hardening migration moved
  agent IDs to an alphabet with no I, O, 0 or 1 was precisely so an ID can be read aloud.
- A signed transcript and outcome receipt afterwards, chained into the existing log, so a disputed
  booking has evidence. This is where the mandate and the approval receipt earn their place.
- **[ASSUMPTION, the one to test first]** that a disclosed, accountable, checkable agent gets hung up on
  materially less often than an undisclosed one. **If that is false the wedge is dead**, and it is
  cheap to test: place calls both ways and count. That test needs no product.

### 13.5 On funding and team, which changes the sequencing

The founder's correction matters. With capital and hires, the constraint is not "avoid anything
requiring density" — it is **"reach a defensible position before an incumbent extends into it."**
Baselayer's weakness is stated in its own coverage: *nobody is legally required to check yet*. They can
fund an 18-month wait. So can we, with a raise — but only from a position they would have to build a
telco to attack.

That reframes the plan as: **own the voice rail while they own the bank check, and let the credential be
the thing both need.** If we later hold the disclosed-agent voice channel, a partnership with Baselayer
is more likely than a fight, because their receivers need our attestations and we need their reach.

### 13.6 What this does not change

- Every line of code built so far stands. Signed credentials, offline verification, the published key
  set, proof of possession, mandates, the chained log, the drop-in verifier — all of it is the
  mechanism, and a voice wedge consumes all of it.
- §10's economics hold: the accountable party pays, verification is free forever.
- §11's targeting holds: merchants and the long tail who want the transaction, never gatekeepers.
- The credential stays industry-agnostic. Voice is the first channel, not the category.

### 13.7 Immediate next steps, in order

1. **Ship the security fix.** Done in this commit — see `20260929200000_fix_signed_action_auth.sql`.
2. **Test the §13.4 assumption before building the voice rail.** Calls placed disclosed versus
   undisclosed, hang-up rate counted. No product required, and it either validates the wedge or kills it
   in days.
3. **Finish making Agent ID solid**, per the founder's one-thing-at-a-time rule: the MCP surface so an
   agent can use Infinity at all, and owner identity behind a real interface (§9 G4, G5).
4. **Then** the voice rail, assuming step 2 passes.

---

## 14. Baselayer profiled, and the agentic-commerce landscape, 2026-09-29

> Founder lifted the financial-services constraint entirely, parked voice, and set the focus:
> **Agent ID + the MCP surface, made to actually work, one thing at a time.** This section is
> intelligence to steer by, not a new direction. Nothing here authorises a pivot.

### 14.1 Baselayer: who they actually are

**[FACT]** Founded **2023** by **Jonathan Awad (CEO)** and **Timothy Hyde (CTO)**, with William Slessman
named as a third founder in some listings. **New York** (CB Insights lists Chicago — sources conflict;
press releases say New York). Roughly **$47M raised in total**, including a $20M round before the
2026-09-22 **$35M Series A led by M13**. One directory claims a 2011 founding date, which is wrong and
contradicted by every primary source.

**What they were built to do:** automate the fragmented process financial institutions use to **verify
businesses and assess risk** — KYB and fraud intelligence — reaching 1 in 5 US financial institutions,
about 2,300 of them. The Agentic Identity Suite, launched alongside the Series A, **extends that existing
infrastructure to agents**.

**[INFERENCE] How dangerous they are, honestly, and where they are not.**

- **Real strengths:** ~3.5 years of distribution into institutions that already buy identity from them;
  capital; and the ability to wait, since by their own coverage *nobody is legally required to check yet*.
- **They are not agent-native.** They are a KYB and fraud-risk company whose agent product is days old,
  built on a **risk-score-at-transaction-time** data model. Their question is *"should this transaction
  be allowed?"* Ours is *"what identity and rails does this agent operate under?"* (§13.1).
- **They will not own a rail.** A fraud-intelligence company does not provision phone numbers, inboxes or
  cards. That remains the structural gap §13 identified, and three and a half years of KYB history makes
  it *less* likely they cross it, not more.
- **Where they will beat us outright:** selling a check to a bank. Do not go there — not because of any
  constraint (the founder lifted that), but because it is their home ground and we would be the third
  vendor in a room they already own.

### 14.2 Agentic commerce: the layer cake is already built, and mostly by giants

**[FACT] Six protocols dominate as of 2026, and they sit at different layers rather than competing:**

| Layer | Protocol | Owner | Status |
| --- | --- | --- | --- |
| Product discovery | **UCP** | Google, co-developed with Shopify, 20+ endorsers | Live; Shopify shipped it to every storefront |
| Discovery / feeds | **ACP** | OpenAI + Stripe | **Retreated from checkout in March 2026**; now effectively a product-feed spec. Founding-maintainer control, no foundation yet |
| Payment authorisation | **AP2** | Google | Donated to the **FIDO Alliance, 2026-04-28** |
| On-chain settlement | **x402** | Coinbase + Cloudflare | Donated to the **Linux Foundation, 2026-07-14** |
| Transaction authentication | **TAP** | Visa; plus Mastercard's agentic rules | Live |
| Tool access | **MCP** | Anthropic | De facto standard |

**[INFERENCE] Read that table as a warning.** Discovery, payment authorisation, settlement and
authentication are all claimed, and two have already been donated to neutral standards bodies — which is
what a category looks like once the giants have finished deciding it. **Anything we build that competes
at these layers loses.** ACP's retreat from checkout is the cautionary detail: OpenAI, with Stripe,
could not make agent checkout stick and fell back to feeds.

**[FACT] And the walled gardens are gating separately from the open specs:** Shopify Agents, Amazon Buy
for Me, Google Agentic Checkout and Klarna Agent Mode are gated on merchant participation and platform
account status. That is §11.2's split again — open rails for merchants who want the sale, closed gardens
for gatekeepers who want control.

### 14.3 Where agentic commerce is genuinely unsolved

Working through the buying journey, the protocols cover discovery → authorisation → payment →
fulfilment. **What none of them covers is what happens when the agent gets it wrong.**

- **[FACT]** Card-network chargeback and dispute rules are written around a **human cardholder who
  authorised a purchase**. In agentic commerce the human authorised a *mandate*, not a transaction.
- **[FACT]** Users already report the failure: Wired's Instinct review records **$64 wasted** alongside
  $550 saved, and Forbes reports bill-negotiation and refund-chasing as a leading agent use case — so
  agents are now on *both* sides of disputes.
- **[INFERENCE]** So the open question is **liability and recourse**: when an agent buys the wrong thing,
  overpays, or double-books, who is accountable, what evidence settles it, and who refunds? Identity
  answers *who acted*. Payment protocols answer *how money moved*. **Nobody has built the layer that
  answers who is liable and proves it afterwards.**

**[INFERENCE] And we are already accidentally well placed for it**, which is worth recording even though
we are not building it now. The dispute layer needs exactly four things we have or have specified: the
**signed mandate** (what the human actually authorised, captured before the purchase), the **chained,
signed log** (what the agent actually did), the **approval receipt** (proof a human sanctioned an
exception), and **insurance** priced from that history — phase 5. §0's original insight, *an independent
party checks work against an expectation recorded in advance*, is a description of a dispute layer.

**Opportunity, stated for later and deliberately not started:** *the accountability and recourse layer for
agentic commerce.* Not a protocol — protocols are taken. The evidence trail that makes the protocols
insurable.

**Threats, stated plainly:**
- **Visa TAP and Mastercard's rules already carry agent identity into the transaction.** If the networks
  extend into liability — which is their actual business — they own this. That is the single biggest
  long-term threat to the whole company, larger than Baselayer.
- **Google owns discovery and payment authorisation** (UCP + AP2 in FIDO). A merchant already
  implementing both has little appetite for a third integration.
- **Amazon-class gatekeepers stay closed regardless.** No credential and no protocol changes a commercial
  refusal (§11.2).

### 14.4 What this changes right now: nothing, and that is the point

The focus stays **Agent ID + the MCP surface, made to work.** Supaprod's documented failure was breadth
substituting for depth, and agentic commerce is exactly the kind of large adjacent opportunity that would
produce another half-built platform. It is recorded here so it is not forgotten and not started.

**One thing does change, and it is free:** MCP is the tool layer of the agentic-commerce stack and the
one layer a startup can legitimately occupy, because Anthropic made it open and every agent speaks it.
**Building our MCP surface well is therefore also the correct agentic-commerce move** — it is how an
agent carrying our credential reaches a merchant at all. No new scope; the same work, better aimed.

---

## 15. Owner attestations, and two founder corrections, 2026-09-29

### 15.1 Correction: global-first, not India-first

Provider research came back weighted toward Indian coverage and I let that skew the
recommendation. **Corrected: coverage breadth and self-serve access decide it,**
with India included rather than centred, because adoption is expected from Western
markets. The conclusion survives the reweighting — the chosen provider is the only
one integrable with no sales call and no monthly minimum — but the reasoning is now
the right way round.

**One finding is geography-independent and worth isolating: Stripe Identity is
disqualified permanently.** Their supported-use-cases terms prohibit reselling ID
verification where that is your primary business, and Infinity sells verification
infrastructure. India not being a supported business location was the lesser
problem. Recorded in AGENTS.md so nobody reaches for the familiar stack later.

### 15.2 Correction: this is for agents, and where the line actually falls

Founder flagged that owner identity verification looked like drift into human
identity. **Half right, and the distinction is worth stating precisely.**

**Agreed and enforced:** we build no KYC product. No dashboards, no document
handling, no PII storage, nothing sold to humans. One screen, brokered out.

**Where I pushed back:** the owner attestation is not a human-identity feature, it
is the **accountability anchor that gives the agent's credential its value**. Remove
it and the credential asserts only *this agent exists* — which is precisely
AliasKit's self-issued position (§12.2) and precisely the reason Amazon gave for
blocking Muse: **identity concealment** (§11.1). Both Persona (with AstraSync) and
Sumsub (with Sumvin) shipped Know Your Agent in 2026 on exactly this premise, an
agent identifier tracing back to a verified entity.

So it lives as **one field inside the agent's credential** and nothing more. The
guardrail is in AGENTS.md, including the tripwire: if the provider adapter starts
growing flows, it has drifted.

### 15.3 What shipped, closing §9 G4

`profiles.identity_verified` was a boolean nobody could set, so every credential
read "identity not yet checked" and the accountable-owner claim was unbacked.

**An attestation replaces the boolean**, because "verified" alone is unfalsifiable —
verified by whom, how, and when? A business deciding on a $5,000 purchase needs to
know it was a government ID with liveness checked last week, not a self-declaration
from two years ago. Each attestation carries **issuer, method, assurance level and
date**, and the credential carries all four.

Three properties worth recording:

- **Operator-asserted, and labelled.** The credential marks the attestation
  `operatorAsserted: true`. Unlike the EdDSA signature, no third party can check it
  offline; it rests on our word plus the provider's. Saying so inside the signed
  payload is the only way a verifier learns the difference — the same discipline
  already enforced between signing and hash-chaining.
- **Assurance is a level, not a flag.** `none` / `basic` / `substantial` / `high`,
  eIDAS-style, so a verifier sets its own bar rather than accepting ours.
  `assuranceForMethod` stops an issuer over-claiming, and a malformed or unknown
  issuer degrades to unverified instead of being trusted.
- **Standing is derived, never stored.** `verify_agent` resolves the live,
  unrevoked, unexpired attestation, so a lapsed check stops reading as verified with
  no backfill. A bare `owner_verified: true` no longer makes a credential claim
  verified — there is a test asserting exactly that.

**PII never enters the database.** Provider webhooks carry extracted personal data
by default, so `stripPii` redacts at the boundary, matching on normalised field
names so `full_name`, `fullName` and `FullName` all collapse to one key. A test
caught the camelCase hole in the first implementation.

**Provider seam is three operations** (`start`, `parseWebhook`, plus an issuer
label), so swapping providers is a file rather than a refactor. Unconfigured
deployments report that verification is unavailable rather than silently marking
owners verified — the same rule as the issuer key never degrading to unsigned.

### 15.4 Also shipped: agent discovery

`/llms.txt` and `/openapi.json`, finishing the rest of §9 G5. Both matter more than
docs usually do, because §4 of the brief says agents are the main users: an agent
that cannot discover how to verify another agent will not do it. `/llms.txt` is
written for a model — every line an instruction, an endpoint or a constraint — and
states the proof-of-possession canonical string explicitly, including the warning to
verify against the key *inside* the credential rather than one handed over
separately.

### 15.5 Phase-1 gap list, current

| Gap | State |
| --- | --- |
| G1 log called "signed" when only chained | **Closed** — signature, signer and nonce columns; forgery path fixed |
| G2 Ed25519 keypair decorative | **Closed** — proof of possession, verified both directions |
| G3 no credential, no key set, no offline check | **Closed** |
| G4 owner identity unsettable | **Closed** — attestations, this section |
| G5 no machine surface | **Closed** — MCP, `llms.txt`, OpenAPI. SDK package still outstanding |
| G6 no SQL in repo | **Closed** — `db/baseline.sql` plus migrations |
| G7 `user_roles` | **Deferred** with a reason, in AGENTS.md |
| G8 `owner_id` spoofable | **Closed** — pinned, verified live with a 403 |
| G9 fake sample agent | **Closed** |
| G10 waitlist discarded emails | **Closed** |
| G11 lint errors, no tests | **Closed** — 0 lint errors, 122 unit tests, 40 live e2e checks |
| G12 README rot | **Closed** |

**So phase 1's mechanism is done.** What remains is not code: the §10.7 test of
whether a business will complete the handshake. That is the next real milestone, and
no further feature work should precede it.

---

## 16. The conformance vector, and two more fixes, 2026-09-29

### 16.1 Two defects Lovable found, both fixed

**The attestation migration would fail on a fresh setup.** Postgres refuses to
change a function's return type through `CREATE OR REPLACE`, so extending
`verify_agent` with four columns needed an explicit `DROP FUNCTION` first. Lovable
worked around it by hand when applying, which means the *live database was fine and
the repo file was broken* — the worse of the two failure modes, because the repo file
is the reproducible artefact and the thing an export-to-self-owned-Postgres depends
on. Fixed in place.

**`current_owner_attestation` was callable by anon.** Holding an owner's internal
UUID would have revealed their assurance level and verification date. No personal
data and those UUIDs are not published, so low severity — but it bought nothing.
Revoked to `service_role`; nothing breaks because its only caller is `verify_agent`,
which is `SECURITY DEFINER` and so executes it with the definer's privileges rather
than the caller's.

**That is the same lesson twice in one day**, after `record_signed_action`: grant
execute to `anon` only where an anonymous caller genuinely needs it. Now a standing
rule in AGENTS.md.

### 16.2 The conformance vector, and why it is the most important thing built today

§10.7 says phase 1 is done when **one business completes the full handshake**, and
that the adoption cost must be lower than the cost of thinking about it. There was a
hard blocker in the way, and it is not obvious until you try to integrate:

**a business cannot test the handshake alone.** Proof of possession requires an
agent's *secret* key. So a developer following our guide could verify a credential
and check status, but could not exercise step 3 — the step that turns the credential
from a bearer token into a key — without first finding a cooperating agent. That is
precisely the friction that kills adoption.

So `/api/public/sandbox` publishes a complete worked example: a credential, the key
set that signed it, a nonce, the exact canonical string, and a valid signature over
it, plus the expected outcomes and five numbered steps. A developer verifies it, sees
it pass, changes one character, sees it fail, and is finished. Deterministic, so they
can commit it to their own test suite.

**Why it cannot become a forgery kit**, which was the obvious objection:

- The sandbox signs with a key derived from a **constant published in our source**,
  so it is explicitly not secret.
- Its issuer is `<origin>/sandbox`, **not** the production issuer, so a verifier
  pinning the real issuer rejects it outright. There is a test asserting exactly
  that, and it is the single most important property in the file.
- The sandbox key never appears in the production key set.
- Its owner reports `assurance: "none"` and its mandate is capped at $100.
- The payload leads with a warning saying anyone can forge it and it proves nothing
  beyond the correctness of your code.

Twelve tests cover the vector, and they are deliberately written as *the integration
guide's contract*: if they fail, every developer following our instructions gets a
broken example, which is worse than shipping none.

### 16.3 State of play

Phase 1's mechanism is complete and now *integrable by a stranger without talking to
us*: 134 unit tests, 40 live end-to-end checks, `llms.txt` for agents, OpenAPI for
developers, and a conformance vector for verifiers.

**The next milestone remains not-code:** getting one business to run it. Everything
after that is a guess until a real verifier has completed the handshake.

---

## 17. Adversarial model audit and trust-activation pass, 2026-09-30

The phase-1 completion claim in §15.5 and §16.3 was too broad. A higher-depth pass traced the actual
MCP request boundary and the customer journey rather than accepting the presence of primitives as an
end-to-end mechanism. It found one release-blocking security defect and two incomplete product claims.

### 17.1 Release blocker found and closed: a public Agent ID authorized mutations

`/mcp` correctly described the bearer Agent ID as public, but then wired that bare ID to
`record_spend`, `request_approval`, and `check_approval`. Anyone who saw a public Verify URL could use
its ID to consume recorded allowance, create owner prompts, or read an approval outcome. Keeping the
underlying SQL functions service-role-only did not protect this path: the public server was the
privileged caller and its application check established existence, not possession.

Protected MCP calls now require a fresh Ed25519 proof over the **exact HTTP request body**:

1. `POST /api/public/challenge/{agent_id}` returns an issuer-signed, agent-bound two-minute token
   without querying or writing the database.
2. The agent signs `INFINITY-POP-v1`, nonce, `POST`, the absolute MCP URL, and the SHA-256 body hash.
3. The request carries `Infinity-Nonce` and `Infinity-Signature`.
4. Infinity checks freshness and the stored public key, then atomically inserts the nonce as consumed
   and bound to that agent before tool dispatch. Duplicate insertion is replay and fails closed.

Read-only tools continue to use the public Agent ID because they expose no more than public
verification surfaces. The live probe now contains the missing adversarial assertion: a copied valid
Agent ID without the private key receives `proof_required` before it can mutate allowance.

### 17.2 Verifier replay ownership is now explicit

The drop-in verifier previously generated random challenges but did not remember which it issued or
whether one had been used. The same valid nonce and signature could therefore be presented twice to
the same verifier instance. `createVerifier` now keeps short-lived outstanding challenges, claims one
before asynchronous verification begins, and rejects unknown, expired, concurrent, or replayed
nonces. The default validity is two minutes and is configurable. An adversarial test repeats the exact
same valid proof and confirms that the second attempt fails before another status call.

### 17.3 The UI now reports evidence, not a blended “verified” state

Issuance no longer says an agent “is now verified.” It says the credential was issued, requires the
owner to confirm secure key storage, and shows three separate activation states: credential issued,
private key handed off, and presenter possession proven. The mandate form now includes the missing
expiry control, cross-field limit validation, accessible field structure, mobile layouts, and explicit
public handoff links.

The public Verify page no longer claims “this agent is who it says it is” from a database lookup. It
separates live status, browser-verified issuer signature, presenter possession (not checked on a shared
page), and operator-asserted owner attestation. Expired credentials have a real expired card state.
Console language also distinguishes agent-signed events from hash-chained system/owner events and
states that Infinity's spend ledger is not itself an external payment rail.

The landing page now leads with the customer outcome—legitimate agents stop getting blocked—and the
implemented mechanism: a signed mandate a business can check for free. Future email, phone, wallet,
and insurance rails remain labelled as roadmap rather than appearing in current-product metadata.

### 17.4 Validation evidence

- `bunx tsc --noEmit`: pass
- `bun run lint`: pass with 0 errors (7 pre-existing Fast Refresh warnings)
- `bun test`: **190 pass, 0 fail**, including same-proof replay, MCP authorization
  fail-closed behavior, challenge freshness, and parallel nonce uniqueness
- `bun run build`: production client, SSR, and Cloudflare Nitro bundles pass
- Browser smoke test: desktop and 390 px mobile landing layouts stay within the viewport; the public
  sample is explicitly non-real; challenge issuance is stateless and reveals no agent-existence
  signal.

This pass introduces `20260930030000_bound_agent_challenges.sql`. **The migration must be applied
before the dependent MCP application code is deployed**, because it changes nonce consumption from
updating a pre-issued row to inserting into a replay ledger. We have no database credentials here, so
Lovable must apply it. Immediately afterward, run the live probe and confirm: repeated/parallel
challenges allocate no rows, valid signed calls consume distinct nonces, replay and wrong-agent proofs
fail, failures leave allowance unchanged, and owner freeze is not blocked by challenge traffic.

### 17.5 What remains, in order

1. **Ship a local signer-aware MCP adapter.** Remote protected calls are secure now, but generic MCP
   clients cannot dynamically sign each HTTP body from a static header configuration. A small local
   adapter must own the `infsk_` key, acquire nonces, and forward signed requests. Until then, do not
   restore the false “one static config enables spending” claim.
2. **Complete owner attestation end to end.** The Didit adapter and database model exist, but there is
   still no reachable start/callback/webhook flow and the provider verdict does not yet return a
   securely bound owner ID. §15.3 closed the data model, not the customer journey.
3. **Bind and sign approval receipts.** Approval rows are one-use and amount-bound, but there is no
   independently verifiable owner receipt bound to the exact approved action. This remains part of the
   differentiation from generic bot authentication.
4. **Run the external verifier milestone.** Phase 1 is still not commercially validated until one
   unrelated business completes credential, challenge, proof, and status in its own codebase in under
   a second.

The governing conclusion is therefore corrected: **the core credential and handshake primitives are
implemented and the discovered MCP impersonation path is closed; phase 1 is not yet a complete
customer loop or an externally validated product.**

---

## 18. Foundation before connectors: accountable-owner activation, 2026-09-30

Founder correction: MCP and other connectors are enablement at the end of a product journey, not the
basement. The basement is the independently checkable credential and the accountable party whose
mandate gives it meaning. The next build therefore closes the owner-accountability customer loop
before adding a local MCP signer or more cross-agent surfaces.

### 18.1 The missing mechanism

§15 shipped the attestation schema and provider adapter but called G4 closed too early. No owner could
start a check, no webhook could safely resolve a result to an owner, and no application path called the
service-role recorder. The credential format could carry accountability evidence, but a customer could
never produce it.

The new flow is deliberately one screen and one hosted redirect:

1. An authenticated owner asks to check the account holder. The database derives `owner_id` from
   `auth.uid()`; no browser request accepts an owner ID.
2. Infinity creates an opaque attempt UUID and sends only that UUID to Didit as `vendor_data`.
3. Didit hosts all document and liveness collection. Infinity never builds document UI.
4. The returned Didit session reference is bound to the same attempt by an owner-scoped function.
5. A raw webhook is authenticated with Didit's separate destination secret. Canonicalization depth is
   bounded before HMAC work so hostile unsigned JSON cannot exhaust the stack; after authentication,
   the body is recursively stripped of PII before semantic processing. Its event ID, provider
   occurrence time, configured workflow ID, approved ID result, approved liveness result, and approved
   face match are checked before a verdict exists.
6. A service-role-only database function resolves the owner from the attempt/reference pair, applies
   provider lifecycle events in order, and inserts or revokes the attestation idempotently.
7. The existing `verify_agent` resolver carries current standing into the public Verify page and the
   next freshly issued VC-JWT.

The protocol follows Didit's current V3 session and webhook contracts
([official documentation](https://docs.didit.me/integration/webhooks),
[API flow](https://docs.didit.me/integration/api-full-flow)). Content was rephrased for compliance
with licensing restrictions.

### 18.2 The identity claim is narrower than the display name

Adversarial review caught a critical semantic gap before release: `profiles.display_name` is chosen by
the account and is not returned as a narrow provider verdict. A user could label an account with
someone else's name and pass the hosted check as themselves. Therefore **the displayed owner name is
self-declared and says so in every public/machine credential surface**. The provider attestation means
that the holder of the account passed the named check; it does not prove that the self-declared label
matches a document.

Infinity still stores no extracted name or document PII. A future requirement to verify a legal name
must be a separate, explicit privacy decision with a minimal provider-backed match result—not an
inference smuggled into this field.

### 18.3 Assurance is earned from signed evidence

An `Approved` session alone is not labelled high assurance. The authenticated webhook must name the
configured immutable workflow and contain successful `id_verifications[]`, `liveness_checks[]`, and
`face_matches[]` results. Missing or different evidence fails closed. This prevents a misconfigured
email-only—or document-plus-unmatched-selfie—workflow from minting a government-ID-plus-liveness claim.

Provider lifecycle remains live rather than frozen at first verdict. A dedicated structural event-ID
ledger makes consecutive and non-consecutive retries idempotent; provider `created_at` orders distinct
events and becomes the attestation's `verified_at`, so delayed delivery cannot make old evidence look
newly checked or renew its one-year life. `Declined → Resubmitted → Approved` can recover, while
`Approved → Kyc Expired` revokes the matching attestation immediately. Older delayed events cannot
overwrite newer standing; distinct allowed transitions in the same provider second are still evaluated
rather than discarded.

### 18.4 Cost, privacy, and UI boundaries

Only one active attempt per owner/provider is allowed. Starts are serialized with an advisory lock,
transport retries reuse the active attempt without creating another paid provider session, and binding
the same provider reference is idempotent. An unbound start lease is ten minutes; a bound hosted check
has twenty-four hours.

The console adds one accountability card—not a KYC dashboard—with honest loading, unavailable,
pending, declined, expired, and attested states. It explains exactly what enters the credential and
what never reaches storage. Signed Didit destination tests are authenticated and acknowledged without
finalization.

### 18.5 Deployment contract

`supabase/migrations/20260930040000_owner_identity_flow.sql` must be applied before this application
slice. The deployment also needs `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`, and `DIDIT_WORKFLOW_ID` in
Lovable's secret store, plus a V3 `status.updated` destination targeting
`/api/webhooks/didit`. Sandbox deployments must explicitly set `DIDIT_ENVIRONMENT=sandbox`; production
defaults to `live`.

After Lovable applies the migration, run the expanded live probe. It verifies anonymous table denial,
auth-derived attempt ownership, duplicate-start reuse, owner-only status, and service-role-only
finalization. Then run one signed Didit console test and one real sandbox flow, confirm no provider PII
landed in either table/logs, and confirm the fresh credential carries the operator-asserted evidence.

### 18.6 Source validation

The final source pass is independently approved after adversarial fixes for self-declared-name
confusion, unsupported assurance, lifecycle revocation/resubmission, duplicate paid starts, receipt-time
renewal, equal-second/non-consecutive retries, test-webhook acknowledgement, pre-authentication nesting,
and PII processing order.

- `bunx tsc --noEmit`: pass
- `bun run lint`: pass with 0 errors (7 pre-existing Fast Refresh warnings)
- `bun test`: **200 pass, 0 fail**
- `bun run build`: production client, SSR, Nitro and Cloudflare bundles pass
- `git diff --check`: pass

Database execution and a real Didit delivery remain intentionally unclaimed until Lovable applies the
migration and the §18.5 deployment probe runs.

---

## 19. Architecture decision record: why Didit, and what Infinity must own, 2026-09-30

**Status: accepted. Owner: founder. Revisit only when the exit criteria in §19.8 fire.**

This section is the durable answer to: *if Infinity integrates Didit and other infrastructure, are we
building a real product or merely assembling vendors?* The founder direction is explicit: build the
strong agent-native basement first; MCP and other connectors come after the trust primitive exists.

### 19.1 Decision in one sentence

**Buy human/business evidence at the edge; own the agent accountability and authorization system.**

Didit answers one narrow input question: *did the holder of this Infinity account complete the stated
human or business evidence check?* Infinity answers the agent-native questions: *which agent is on the
wire, does it hold its key, which account delegated to it, what may it do, is the mandate live, and did
the owner approve this exact exception?*

Didit is an optional root-evidence provider. It is not Infinity's credential issuer, policy engine,
status authority, approval authority, product category, or customer-facing identity system.

### 19.2 Why this capability is bought rather than built

Government-document coverage, document-template updates, camera capture, liveness and presentation-
attack detection, face matching, fraud operations, country coverage, and provider compliance are a
specialized product and operating burden. Rebuilding them would:

- move document images and extracted PII into Infinity's threat surface;
- make us a KYC vendor rather than an agent-accountability company;
- consume the team on country/document maintenance that does not improve agent acceptance;
- weaken neutrality by making our own human-verification quality another self-issued claim; and
- delay the agent-specific primitives no general KYC provider supplies.

The build-versus-buy boundary is therefore structural, not temporary expedience.

| Capability | Decision | Reason |
| --- | --- | --- |
| Document capture and OCR | Buy | Country/document maintenance; high PII exposure |
| Liveness and face match | Buy | Specialist fraud models and attack research |
| Human/KYB evidence verdict | Buy, provider-swappable | A root input, explicitly operator-asserted |
| Agent key and proof of possession | **Own** | Identifies the software presenter, not the human |
| Owner-to-agent delegation | **Own** | The accountability relationship is our product |
| Signed mandate and policy semantics | **Own** | Says what the agent is pre-authorized to do |
| Live status, expiry and revocation | **Own** | Lets the accountable account stop the agent |
| Exact-action approval receipt | **Own** | Proves a human approved this exception |
| Free verifier and conformance contract | **Own** | Creates acceptance on the scarce verifier side |
| Protocol adapters (MCP/UCP/Web Bot Auth) | Integrate last | Distribution rails over the finished primitive |

### 19.3 Why Didit is the first provider

The first provider must prove the interface without creating enterprise-sales or geography lock-in.
Didit currently offers the required shape: self-serve applications and scoped API keys, hosted sessions,
visual KYC workflows, separate sandbox/live applications, an opaque `vendor_data` correlation field,
and HMAC-signed V3 webhooks with retry-stable event IDs. Hosted capture keeps Infinity out of the
document UI and lets the provider improve completion and fraud resistance independently.

Selection is global-first. Didit was chosen for breadth, self-serve access, hosted flow, and absence of a
required sales process—not for one country's depth and not because its brand is part of our product.
Stripe Identity remains disqualified under the existing scope/terms decision. Persona and Sumsub remain
credible replacements if they meet the same interface and commercial-access requirements.

References: [Didit quick start](https://docs.didit.me/getting-started/quick-start),
[application-scoped API keys](https://docs.didit.me/getting-started/api-authentication),
[V3 webhook contract](https://docs.didit.me/integration/webhooks), and
[sandbox model](https://docs.didit.me/integration/sandbox-testing). Content was rephrased for
compliance with licensing restrictions.

### 19.4 What Infinity's niche is

Internally, Infinity is an **accountability and authorization certificate authority for autonomous
agents**. Externally, never lead with that category language; lead with the result: a legitimate agent
stops getting blocked because a counterparty can accept it safely.

The minimum complete trust object binds five independently meaningful facts:

1. **Agent subject** — a stable ID and agent-held Ed25519 public key.
2. **Accountability anchor** — an account holder with explicit provider/method/assurance/date evidence.
3. **Delegated mandate** — permissions, limits, approval threshold and validity window signed by
   Infinity.
4. **Live control** — current status, revocation, expiry and eventually safe key rotation.
5. **Action evidence** — request-bound proof of possession and owner-signed receipts for exceptions.

A Didit result alone contains none of facts 1, 3, 4 or 5 and does not create an agent identity. Infinity
turns a narrow accountability input into an agent-native credential and live decision system that an
unrelated business can verify for free.

### 19.5 The anti-wrapper test

Infinity has drifted into a wrapper if any of these become true:

- the product is marketed as access to Didit or as a KYC dashboard;
- replacing Didit changes the agent credential, mandate, verifier or public status protocol;
- value is described as the count of integrated vendors rather than a completed trust decision;
- customer PII or provider documents become Infinity's system of record;
- a credential is considered complete merely because a provider returned `Approved`; or
- connectors are built before key lifecycle, mandate lifecycle and approval evidence are sound.

The positive test is: **if Didit disappeared tomorrow, every agent credential, key proof, mandate,
revocation and verifier would continue to work; owner evidence would honestly fall back to “not
checked” until another provider was connected.**

### 19.6 Provider abstraction and portability rules

- The generic attestation is `issuer + method + assurance + verifiedAt + operatorAsserted`; no
  Didit-specific claim enters the credential contract.
- Every verifier sees who checked what and chooses its own assurance floor.
- The owner display name remains `self_declared`; this integration proves the account holder passed a
  check, not that the label matches a document.
- Provider payloads are authenticated first, stripped of PII at the boundary, and projected into a
  narrow verdict. Raw payloads are never stored or logged.
- Only opaque attempt, provider session, event IDs, coarse lifecycle state and the attestation are
  persisted.
- Provider reference-to-owner binding is resolved by the database; neither browser nor webhook accepts
  an owner ID.
- Provider replacement must be one adapter plus configuration, not a credential or product migration.
- Standard SQL remains the source of truth so the data layer is portable beyond Lovable Cloud.

### 19.7 Trust language that must never drift

Didit does not independently sign Infinity's public credential. Infinity verifies a Didit webhook and
then makes an **operator-asserted** claim. The credential must continue to say so. The verifier can
independently verify Infinity's EdDSA signature and the agent's proof of possession; it cannot
independently reconstruct the owner's document check from our narrow record.

Likewise, a self-declared account label must never be displayed as a provider-verified legal name. If a
future customer requires legal-name matching, add an explicit provider-backed *match result* with a
separate privacy and retention decision; do not silently start storing extracted names.

### 19.8 Exit criteria and provider review

Do not add providers for logo count. Re-evaluate Didit or add a second provider only when at least one
is true:

- a required launch country/document is unsupported or materially underperforms;
- business/KYB demand becomes a real customer requirement;
- self-serve access, pricing, terms or reliability no longer fit the product;
- the webhook cannot support the evidence, lifecycle or security guarantees in §18;
- a provider can emit a directly verifiable signed attestation, reducing operator assertion;
- concentration risk is blocking a paying customer; or
- five real verifier conversations establish a materially different assurance requirement.

At that point compare coverage, completion, fraud resistance, direct attestation verifiability,
self-serve access, unit economics, data residency, deletion controls, webhook semantics and exit cost.
Regional depth is a tie-breaker, never the primary decision.

### 19.9 Build order after this decision

1. Apply and live-probe the owner-accountability migration and one Didit sandbox flow.
2. Complete mandate lifecycle: edit/reissue semantics, history and verifier-visible versioning.
3. Build safe agent-key rotation/recovery without silently changing identity.
4. Produce independently verifiable, action-bound owner approval receipts.
5. Complete the external-business handshake milestone.
6. Only then package the finished primitive into local MCP, UCP, Web Bot Auth and framework adapters.

This order is binding until real verifier evidence changes it.
