# Review: "Hugging Face for agents" + creator/ownership economy + YouTube monetization model

> _Written 2026-09-24, in response to the marketplace direction. Companion to [`DIRECTION.md`](./DIRECTION.md).
> Labels follow Supaprod's convention: **[FACT]** has a source, **[ASSUMPTION]** is believed and untested,
> **[INFERENCE]** is reasoned from facts. Source content was rephrased for licensing compliance._

## Verdict in one paragraph

**The catalog layer is gone, the creator-payout model has already been tested at scale and failed, and
the blockchain expression of this has had its bubble and popped.** What remains open, and what your
instinct is actually circling, is the **trust and settlement layer**: independent proof that agent work
was actually done and done correctly, which is what makes any of these marketplaces liquid and what
makes outcome-based pricing possible. That is the same primitive as `DIRECTION.md`, one layer up.
Recommendation: **do not build the marketplace. Build the thing marketplaces cannot exist without.**

---

## 1. Why the analogies break

Both analogies are load-bearing, so they are worth testing rather than accepting.

**Hugging Face won because model weights are large, expensive, non-substitutable artifacts with real
hosting cost, and it arrived in 2020 before the hyperscalers cared.** Agent definitions are the
opposite: a skill or MCP config is a small text file with near-zero distribution cost. There is no
hosting moat to own. And the hyperscalers already arrived — see §2.

**YouTube won on three properties agent work does not have.** It owned distribution of a scarce,
non-substitutable asset (a specific creator's specific video); demand was consumer attention, which is
elastic and ungated; and advertisers paid, so the viewer never had to. Agent capabilities are highly
substitutable — a frontier release replicates most of them for free — demand is enterprise procurement,
which is inelastic and gated, and there is no ad model. The analogy breaks at all three joints. What
YouTube *actually* monetized was not the catalog; it was measurement plus Content ID, i.e. knowing what
a thing is and whether it can be trusted enough to pay for. **That part of the analogy holds, and it is
the part worth taking.**

---

## 2. The catalog and discovery layer is already claimed

**[FACT]** On **17 June 2026**, Google published the **Agentic Resource Discovery (ARD)** specification
— an open, Apache-2.0 standard for publishing, indexing and discovering agents, MCP servers, tools and
workflows. Co-authored by Google, Microsoft and **Hugging Face**, with launch participation from Amazon,
Cisco, Databricks, GitHub, GoDaddy, Nvidia, Salesforce, ServiceNow and Snowflake
([Microsoft](https://commandline.microsoft.com/agentic-resource-discovery-specification-ard).),
[Hugging Face](https://huggingface.co/blog/agentic-resource-discovery-launch)). GitHub shipped
**agent finder** alongside it, so Copilot can discover and call MCP servers, skills and agents at runtime.

**[INFERENCE]** "Hugging Face for agents" is now a standard that Hugging Face itself co-wrote, with
eleven platform owners implementing it. A third-party registry is not a company; it is a row in
someone else's index. Even the favourable commentary frames ARD as foundational infrastructure and asks
what it *misses* ([synscribe](https://www.synscribe.com/blog/google-agentic-resource-discovery-ard-specification)) —
and what it misses is trust, not discovery.

**[FACT]** The enterprise marketplaces are also already built and defended: Salesforce **AgentExchange**
(unifying AppExchange, Slack Marketplace and Agentforce, with Private Offers and unified billing to
remove procurement friction), **Microsoft Marketplace** (11,000+ models, 4,000+ AI apps and agents),
AWS, and Google Agentspace inside Gemini Enterprise
([Futurum](https://futurumgroup.com/insights/can-agentexchange-cement-salesforces-lead-in-the-agentic-ai-platform-race/),
[flaex](https://www.flaex.ai/blog/best-ai-agent-directories-and-marketplaces-in-2026)).

---

## 3. The creator-payout model has already been run as an experiment. It failed.

**[FACT]** OpenAI's GPT Store is the largest test of exactly this thesis — publish an agent, users use
it, creator gets a revenue share. Outcome: roughly **3 million GPTs created, only ~159,000 public and
active**, and typical creator payouts capped around **$100–500/month**, with top builders in the low
thousands ([digitalapplied](https://www.digitalapplied.com/blog/gpt-store-custom-gpts-business-guide-2026),
[ideaproof](https://ideaproof.io/lists/gpt-store-business-ideas)). Wired reported creators turning to
outside revenue sources instead ([Wired](https://www.wired.com/story/openai-gpt-store/)).

**[INFERENCE]** The structural reason is worth internalising, because it applies to any venue you build:
**agent capability is substitutable and the platform owns the customer relationship.** A creator cannot
accrue pricing power over something the next model release gives away. YouTube creators have leverage
because nobody else can make their video. An agent builder has none because the platform, or the model,
can make the agent.

**[FACT]** Supply is already oversupplied and demand is the scarce side: 3M GPTs against 159k active.
The advice that now circulates to builders is to publish the same capability simultaneously as a Skill,
a GPT, an MCP server and a Hugging Face Space
([digitalapplied](https://www.digitalapplied.com/blog/ai-agent-marketplaces-2026-discovery-distribution)) —
which is what a commodity with no distribution moat looks like.

---

## 4. The blockchain version already had its cycle

**[FACT]** Agent-related tokens peaked around a **$16B** combined market cap, then most fell more than
90% from their highs ([CoinGecko](https://www.coingecko.com/learn/ai-agent-market-map-hype-ends-technology-continues)).
**[FACT]** Virtuals Protocol — the largest agent economy — reported Q1 2026 revenue down **85% to
$3.03M**, with daily protocol revenue falling from a peak near $7.8M to roughly **$32K**, a 99.6% decline
([ainvest](https://www.ainvest.com/news/virtuals-protocol-revenue-normalization-signals-ai-crypto-sector-consolidation-2605/),
[captainaltcoin](https://captainaltcoin.com/virtuals-protocol-virtual-revenue-crashes-99-6-as-bnb-chain-loads-up-with-google-cloud-aws-and-binance-pay/)).
**[FACT]** On **4 August 2026**, the founder of an agent project once valued at $2.4B told his own
investors to sell and declared the token dead; it is down over 99.9% from peak
([Motley Fool](https://www.fool.com/investing/2026/08/20/an-ai-agent-token-once-worth-24-billion-is-now-wor/)).

**[FACT, from Supaprod's own prior research]** Agent payment rails show weak demand independently of
token prices: OpenAI retired ChatGPT Instant Checkout in March 2026, and x402 volume fell from ~$800K
to about $40K a day, with some of that characterised as partly synthetic.

**Decision on blockchain: no.** It is justified only when you need trustless settlement between parties
with no legal relationship, censorship resistance, or a cross-platform ownership ledger. None of those
is the bottleneck here. Today it adds regulatory surface, fundraising friction and user confusion for
zero user benefit. Revisit only if a cross-platform royalty ledger becomes the actual product, and even
then Postgres plus Stripe wins until there is volume to justify otherwise.

---

## 5. TAM / SAM / SOM, honestly

**TAM — the envelope, and it is genuinely enormous. [FACT], vendor forecasts.**

| Anchor | Figure | Source |
| --- | --- | --- |
| Agentic AI software spend | $206.5B (2026) → **$985B by 2030**, 62.7% CAGR | Gartner |
| Stand-alone AI agents and assistants, consumer + enterprise | ~**$222B**, growing 13x 2025→2030 | [Gartner](https://www.gartner.com/en/documents/8262857) |
| Enterprise cross-functional agents and assistants | >**$23B by 2030**, 59% CAGR | [Gartner](https://www.gartner.com/en/documents/7509353) |
| Active agents in organisations | **2.5B by 2030** (~80x 2025), 459T actions/yr vs 48B today | [IDC](https://www.idc.com/resource-center/blog/the-agent-economy-is-scaling-faster-than-it-can-be-metered/) |
| Enterprise app spend exposed to agentic disruption | up to **$234B** through 2030 | [Gartner](https://www.gartner.com/en/newsroom/press-releases/2026-07-01-gartner-says-us-dollars-234-billion-in-enterprise-application-software-spend-is-at-risk-from-agentic-artificial-intelligence) |

**A huge TAM is not the finding. It is the trap.** The relevant question is what a neutral third party
can charge a take rate on, and that is the SAM.

**SAM if you build the marketplace — this is the number that kills it. [FACT] + [INFERENCE].**
The only at-scale proxy for third-party agent work actually transacted is Virtuals: **$479M of agent
economic activity in Q1 2026 producing $3.03M of protocol revenue**, a realised take of roughly
**0.63%** ([tipranks](https://www.tipranks.com/news/virtuals-protocol-is-turning-ai-agents-into-an-economy)).
Annualised that is on the order of $1.9B of GMV and **~$12M of revenue — for the single largest agent
economy in existence, while shrinking 85% quarter over quarter.** The consumer-creator comparable, GPT
Store, pays most builders $100–500/month. **So the addressable revenue for a neutral agent marketplace
in 2026 is single-digit to low-tens of millions of dollars, contested by eleven platform owners who
already hold the buyer relationship and the billing rail.**

**SAM if you build the trust and settlement layer. [ASSUMPTION], and labelled as one.**
Conservative floor: Gartner sized AI governance *platforms* at **$492M in 2026** (from Supaprod's own
research). Upper bound: if independent verification attaches to even **1%** of agentic software spend,
that is roughly **$2B in 2026**. Nobody knows where in that range it lands, and I will not pretend to.
The useful conclusion is that its floor is larger than the marketplace's ceiling.

**SOM — the only number that matters in the next two weeks: three paying users.** Everything above is
context for a fundraise conversation, not a plan. Supaprod had 630k lines of code and a beautiful market
map and zero users; the TAM table was never the missing input.

---

## 6. Would customers love it? Answered per side, because marketplaces have two.

**Supply side — agent builders: yes, and that is the problem.** They are desperate for distribution,
which means they will list anywhere for free and pay nothing. **[FACT]** 3M GPTs against 159k active,
and prevailing advice is to publish the same capability across four venues simultaneously. An
oversupplied supply side that cannot pay is the classic shape of a failed marketplace.

**Demand side — buyers: no, not from a neutral third party.** **[FACT]** 65% of enterprises prefer
incumbents (a16z, via Supaprod's research), and Salesforce added Private Offers with unified billing
specifically so buying an agent requires no new procurement relationship. A solo founder cannot match a
vendor the customer's finance team has already onboarded.

**B2C: the weakest side.** **[FACT]** AI apps churn ~30% faster than non-AI apps, with 21.1% annual
retention versus 30.7%, and consumer-agent winners exit to labs rather than compounding (Manus → Meta,
~$2B). Creator payouts, per §3, do not clear a living wage.

**And the practical objection that decides it:** a two-sided marketplace needs liquidity, liquidity needs
capital and time, and you have **fourteen days and no audience**. This is the worst possible shape for
your constraints. It is also, structurally, the same mistake as Supaprod — a platform sale from a solo
founder — wearing different clothes.

---

## 7. The part of your instinct that is right, and what to do with it

Three things in your framing survive contact with the evidence, and they all point the same way.

**"Create work and get paid" is the real shift.** **[FACT]** Seat-based pricing breaks when the agent
rather than the seat does the work, and there is no principled reason to charge the customer running ten
tasks the same as the one running a thousand
([The Innovation Attorney](https://theinnovationattorney.substack.com/p/agentic-ai-pricing-in-2026)).
Outcome-based pricing is where this goes.

**Nobody can currently settle it.** **[FACT]** IDC's own framing is that the agent economy is *"scaling
faster than it can be metered."* Note the precise gap: metering as counting tokens and actions is
already owned — Stripe bought Metronome, Adyen bought Orb. What is not owned is **adjudication: did the
promised outcome actually occur, judged by someone other than the party being paid.** You cannot price
on outcomes until an independent party can certify the outcome.

**ARD standardised discovery and deliberately left trust out.** Eleven platform owners agreed on how to
*find* an agent. None of them can credibly certify an agent, because each one sells agents. Independence
is structurally unavailable to every participant in that coalition — which is the one property
Supaprod's research concluded the labs cannot absorb.

**So the marketplace is not the company. The referee is.** Every liquid marketplace in history shipped
a trust primitive before it shipped volume: eBay feedback, Airbnb reviews, Upwork's work diary, YouTube's
Content ID. The agent economy has a catalog, a payment rail and a meter. **It has no referee.** And a
referee does not need two-sided liquidity to be useful on day one — it is valuable to a single buyer
checking a single piece of work, which is exactly why it is provable in fourteen days and a marketplace
is not.

**This converges with `DIRECTION.md` rather than replacing it.** The primitive there — independent
verification of work you did not produce, against sources, with a link the recipient can open — is the
same primitive. Documents are the wedge because they are the fastest path to a stranger paying. Agent
output is the expansion, and it is where the large market is. Build the wedge, keep the expansion in the
thesis, and do not build the catalog.

**What would change this conclusion:** evidence that buyers pay a neutral venue a take rate on agent work
they could have bought through Salesforce or Microsoft. I found none. If you find it, reopen this.
