# Project Infinity: the trust layer for every agent

## 1. What it is
Every agent (Claude Code, Instinct, Muse, Wajo's Fo, or a company's own) connects to Infinity and gets what a person has: a verified ID tied to a real owner, its own email and phone number, a wallet with limits, a track record and insurance. Any business or app can check that ID before it deals with the agent.

We work in every industry and inside every app. We never build a "travel agent" or a "legal agent". We are the layer underneath all of them.

## 2. Positioning: why Muse or Instinct can't copy us
The risk you raised: if Muse or Instinct build these features themselves, do we become obsolete? Here is why that doesn't happen, and how we stay ahead.

1. **Neutrality is the product.** Instinct can give its own agents an ID, but a bank, airline or shop won't trust an ID issued by the agent's own maker, any more than it trusts a passport someone printed at home. It will trust an independent party that checks agents from every company. Muse and Instinct are competitors, so neither can be that party for the other. Only a neutral layer can be. This is how Visa and Stripe became standards instead of any single bank.
2. **They become customers, not rivals.** Wajo already had to build single-use cards, its own email, a password vault and human backup. Every agent company rebuilds the same plumbing. We sell it once to all of them.
3. **The track record builds over time.** Every agent action through us adds to a history across companies. Insurance, trust scores and fraud detection depend on it. A newcomer, or one company that only sees its own agents, cannot recreate it.
4. **Two-sided network.** The more businesses check Infinity IDs, the more agents need one, and the other way round. Being first in one high-value place (email and phone checks) starts that loop.
5. **Built on open standards.** We use open formats (MCP for agent add-ons, signed credentials for IDs), so adopting us costs nothing. We don't compete on the format itself; we compete on being the trusted issuer, and on the history behind each ID.

**The one-line pitch:** *"The passport, bank account and phone line for AI agents, trusted by every business because we don't make agents."*

## 3. Where it lives: keep it simple
Wajo runs on iMessage and Muse on WhatsApp because those are consumer assistants. We are infrastructure, so our "surface" is wherever agents already run:
- **For developers:** one add-on (MCP) plus an API. Any agent gets its ID, email, phone and wallet in minutes.
- **For owners:** a clean web console to create agents, set limits, approve actions and hit the off switch. Approvals also arrive by push, SMS or WhatsApp.
- **For businesses:** a public "Verify agent" page and a one-line check they can add to their checkout, phone line or inbox.
No mobile app in phase 1; the web console works well on phones.

## 4. How it works (the questions you asked)
- **Bringing in an outside agent:** the owner clicks "Add agent", picks the source (Claude Code, OpenAI, custom...), and gets an Agent ID plus a secret key. The agent installs our add-on and can then prove who it is.
- **Tying the ID to a real person:** the owner passes a one-time identity check, like opening a bank account (through a provider such as Stripe Identity or Persona). Every agent points to that verified owner, who is responsible for it the way you are for your car.
- **Making it checkable:** each agent has its own digital signing key. Every email, call and payment carries a signature anyone can check on our Verify page, without trusting the agent's maker.
- **Wallet:** held by a licensed partner (Stripe Issuing, or a stablecoin wallet). The agent gets a virtual card. Every payment is checked against the owner's limits, and anything larger waits for approval.
- **Insurance:** we're the broker, not the insurer. At first, small refunds come from a reserve funded by a fee on each transaction. Later, an insurance partner writes the policies, priced from the track record. Claims are settled using our signed receipts.
- **Email and phone:** inboxes on our domain and numbers from Twilio, both limited by the owner's settings, and marked "verified agent for [owner]".

## 5. Phases (one at a time; each must work before the next starts)
| Phase | What ships | How we know it works |
|---|---|---|
| **1. ID + Verify** | Owner sign-up, "Add agent", Agent ID and keys, owner limits, public Verify page, signed activity log, off switch | 10 outside agents onboarded; businesses successfully check IDs |
| 2. Email | Each agent gets its own inbox, with every email signed | Agents send and receive real email |
| 3. Phone | Numbers, SMS and calls | Agent calls a business and passes verification |
| 4. Wallet | Virtual cards with limits and owner approval | First real payments |
| 5. Track record + insurance | Trust score, refund reserve, then an insurance partner | First claim paid |

**This build is phase 1 only.**

## 6. Phase 1 screens
1. **Home page:** the one-line pitch, how it works in three steps, the add-on in a code box, and a waitlist.
2. **Sign in and owner verification** (identity check as a placeholder step for now).
3. **Agents console:** list of agents, each showing its status, source and last activity.
4. **Add agent:** pick a source, name it, set limits (allowed actions, spending cap, when to ask for approval, expiry date), then receive the Agent ID and a one-time secret key.
5. **Agent detail:** ID card view, limits, signed activity log, and a large off switch.
6. **Public Verify page (`/verify/<id>`):** shows valid, frozen or unknown, the verified owner, the limits, and when it was issued. It is shareable and the design is the showpiece.

## 7. Design direction
A premium, calm feel like what Anthropic, OpenAI or Google ship: a warm near-white background with near-black text, one restrained accent color, and plenty of space. A refined serif for headlines (such as Instrument Serif), a clean sans for text (such as Geist), and a monospace font for IDs and keys. Thin dividers, hardly any shadows, subtle motion. The ID card and Verify page are designed to feel like a real passport. Dark mode included. Before building, I'll show you three rendered design options to pick from.

## 8. Technical details
- Sign-in and data use your own Supabase project, connected in Project Settings → Connectors. It must be connected before phase 1 is built.
- Tables: `owners`, `agents`, `agent_keys` (public key only), `mandates`, `events` (hash-chained and signed), plus `user_roles` in its own table. Every table gets GRANTs and row-level security.
- Routes: `/`, `/auth`, `/_authenticated/agents`, `/_authenticated/agents/new`, `/_authenticated/agents/$id`, public `/verify/$agentId`, `/api/public/verify/$agentId` (JSON), and the MCP add-on at `/mcp` with the tools `whoami`, `get_limits` and `sign_action`.
- Ed25519 keys are generated in the browser. The private key is shown once, and only the public key is stored.
- I'll update DIRECTION.md and README.md to record this change of direction (no new docs).
