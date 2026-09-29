# Project Infinity: the identity and trust layer for any company's agents

## 1. The idea
Agents from Claude Code, Muse, Instinct, OpenAI or a startup's own code connect to us and get everything a person has: an ID tied to a real owner, a phone number and email, a wallet, a track record and insurance. We don't build agents. We make every agent accountable, so we can sit inside every app.

**Core rule: works in every industry, and grows by showing up everywhere agents work.**
- We never build features for one industry or one kind of task (no "travel agent" or "legal agent" products). An agent booking flights, filing taxes or writing code uses the same ID, limits, wallet and receipts.
- We grow by being present wherever agents already run: an add-on inside Claude Code, ChatGPT, Muse and similar tools, plus a check button businesses put on their checkout, phone line or inbox.
- Industry-specific needs (for example, healthcare privacy rules) become settings on the permission slip, never separate products.

**What Wajo shows us (wajo.ai, reviewed 29 Sep 2026).** Wajo's agent "Fo" runs errands the way Instinct does: it calls, emails, books, pays and cancels, and hands tricky cases to human assistants. To make that safe, Wajo had to build its own single-use payment cards, its own email address, a password vault and human backup. Every errand-agent company is rebuilding these same pieces. That makes Wajo, Instinct and Muse **our customers, not our competitors**: they could plug into us instead of building it all themselves. Wajo's "Fo handles it with trained assistants" feature also suggests one more layer to add: **human backup on demand** that any agent can call in.

## 2. Everything an agent needs, beyond the obvious
| # | Layer | What it means for an agent |
|---|---|---|
| 1 | Identity / passport | A unique ID that can be checked, owned by a named person or company |
| 2 | Permission slip | What it may do, spend and sign, for how long, and whether the owner must approve first |
| 3 | Phone number + email | Its own contact details, so it never borrows yours |
| 4 | Wallet / bank | Money with limits and an audit trail |
| 5 | Logins and keys | Access to other services without ever seeing your password |
| 6 | Track record | A trust score from every action, visible to businesses |
| 7 | Insurance | Pays out when an agent makes a costly mistake |
| 8 | **Disputes and refunds** | Someone to settle "the agent booked the wrong thing" (commonly overlooked) |
| 9 | **Off switch** | Instantly freeze an agent everywhere: calls, money, logins |
| 10 | **Receipts / proof of work** | A signed record of what the agent did, for whom, and when |
| 11 | **Agent-to-agent handshake** | Two agents confirm each other's ID and limits before they deal |
| 12 | **Legal / contracts** | Terms that make the owner answerable, so businesses will accept agents |
| 13 | **Tax and invoices** | Agents that earn or spend need records an accountant can use |
| 14 | **Inheritance / handover** | What happens to an agent's number, money and history if its owner leaves |

## 3. How connecting another company's agent works
```text
Owner signs up and proves who they are (ID check, like opening a bank account)
   -> "Add agent": pick the source (Claude Code, Muse, custom...) and name it
   -> We issue an Agent ID and a secret key, and the agent installs our small plugin
   -> Owner sets the permission slip (limits, approvals, time window)
   -> Agent receives its number, inbox and wallet
   -> Every action goes through us, is signed, logged and scored
```
- **Plugging in:** most agent tools accept add-ons in a standard format (MCP). We ship one, so any compatible agent gets tools like "send email", "call", "pay" and "prove who I am" in minutes. Developers also get a simple API.
- **How the ID is issued:** each agent gets its own digital key pair. Every message and payment is signed with it, so anyone can confirm it came from that agent without trusting the agent's maker.
- **How it's tied to a real person:** the owner passes a one-time identity check (through a provider such as Stripe Identity or Persona). Every agent record points to that verified owner, and the owner is responsible for the agent, the same way you are responsible for your car.
- **Wallet:** held by a licensed partner (Stripe Treasury/Issuing, or a stablecoin wallet). The agent gets a virtual card or account. Every spend is checked against the permission slip first, and anything above the limit waits for the owner to approve.
- **Insurance:** we're the agent's broker, not the insurer. Stage 1: we cover small refunds from a reserve funded by a fee on each transaction. Stage 2: an insurance partner writes the policies, priced from our track-record data. Claims are approved from our signed receipts, which show exactly what happened.
- **Phone and email:** numbers from Twilio and inboxes on our domain, both limited by the permission slip. Calls and messages show a "verified agent for [owner]" tag.

## 4. How we make money
Monthly fee per agent, plus per-use charges (numbers, messages, ID checks), a small cut of wallet transactions, insurance commissions, and a paid plan for businesses that check agent IDs.

## 5. Two products, one foundation
```text
  Our own errand assistant (Wajo-style)  |  Other companies' agents (Claude Code, Muse, Wajo...)
                    \                        /
          Agent ID + permission slip + email/phone + wallet + receipts + off switch
```
- **Infinity Assistant** (the Wajo-style product): you type "book a dentist Thursday" or "cancel my gym" and it emails, calls and pays on your behalf, using its own email address, single-use cards, and a human helper when it gets stuck. What makes it different from Wajo: every action carries a checkable Agent ID and a signed receipt, and you can export the assistant's number, history and limits to any other agent.
- **Why build both:** the assistant is our first and most demanding customer. It proves the foundation works, earns money directly from users, and gives us real track-record data from day one. Other agents then plug into the same foundation.

## 6. First build (to prove the idea)
1. Home page and waitlist, presenting both products.
2. Owner sign-up with an identity check step (a placeholder at first).
3. **Assistant:** a chat where you type a task. The assistant plans it, shows each step, asks for approval before it sends or pays anything, and can send real emails from its own inbox. Calling and paying come later.
4. **Agents dashboard:** add an outside agent (pick its source and name it), set its permission slip, and get its Agent ID and secret key.
5. Our add-on (MCP) with tools any agent can use: send email, get my limits, prove who I am.
6. Public check page for each agent, and an API anyone can use to confirm a signature.
7. Activity log with signed receipts, plus an off switch.
Next steps: phone calls, single-use cards, human backup, disputes, then insurance.

## 7. Technical details
- Your own Supabase project (connected in Project Settings → Connectors) for sign-in and data. Tables: `owners`, `agents`, `agent_keys`, `mandates`, `events`, `channels`, plus `user_roles` in its own table. Row-level security on every table.
- Routes: `/`, `/_authenticated/agents`, `/_authenticated/agents/$id`, public `/a/$handle`, `/api/public/verify`, and `/api/public/mcp` (the add-on endpoint, which checks the agent's key on every call).
- Each agent's key pair is Ed25519. Only the public key is stored; every event is signed and chained so the log can't be altered.
- Partner services (Twilio, Stripe, identity check) come in later steps, with their keys stored as secrets.
- I'll update DIRECTION.md to record this change of direction, including dropping the financial-services limit.
