# Brainstorm: infrastructure that treats agents like people

## 1. The idea
Soon, agents will run errands, buy things, call businesses and sign up for services. Today they borrow a human's card, phone number, email and login, which is unsafe and nobody can hold them accountable. The opportunity: give every agent what a person has, meaning an identity, a phone number and email, a wallet with limits, a track record, and insurance. Businesses then know who they're dealing with and who is responsible.

## 2. The building blocks and who is already there (from memory; I'll check before we commit)
| Layer | What it gives an agent | Existing players | How open it is |
|---|---|---|---|
| Identity / passport | A verifiable "this agent works for this person, within these limits" | Early standards work; Visa and Mastercard agent tokens | Open. Nobody has built it for everyday use |
| Phone number + email | Its own number and inbox, to call, text and receive codes | Twilio (raw pipes); a few agent-inbox startups | Partly open. Nobody bundles it with identity |
| Wallet / bank | Money with spending limits | Stripe, Coinbase agent payments, Skyfire, Payman | Crowded and heavily regulated |
| Track record | A trust score built from past behaviour | Almost nobody | Open, and it builds over time |
| Insurance | Pays out when an agent makes a costly mistake | One or two early startups | Open, but needs the track record first |

## 3. What makes us different
Everyone else sells one piece. We sell **one "Agent ID" that ties them together**: identity, number, inbox and limits in one place, with a track record that grows on every call and payment. Like a SIM card plus a passport for agents. The track record is what we own: the big AI companies only see their own agents, while we see agents from every company.

**How we grow into the rest:**
```text
Stage 1  Agent ID + phone number + inbox + limits    (no money involved; ship in weeks)
Stage 2  Track record built from every interaction
Stage 3  Wallet through a licensed partner such as Stripe (we never hold the money)
Stage 4  Insurance priced from the track record, with an insurance partner
```

## 4. A conflict you need to settle
DIRECTION.md (§14, constraint 5) rules out anything close to financial services because it's close to your former employer's field. The bank, wallet and insurance stages fall under that. Options:
- **A.** Build only Stages 1–2 and leave money and insurance to partners.
- **B.** You lift the constraint on purpose, and I'll record that decision in DIRECTION.md.

## 5. First build (Stage 1, after you approve)
1. **Home page** explaining Agent ID, with a waitlist signup.
2. **Dashboard:** create an agent, name who it works for, and set its limits (what it may do, spending cap, ask-me-first rules).
3. **Each agent gets:** an inbox and a phone number (provided by Twilio), plus a public page businesses can use to check the agent's ID.
4. **Activity log:** every message, call and action, which becomes the start of the track record.
5. **Developer key**, so another agent can check an Agent ID with one request.

## 6. Technical details
- Storage and sign-in use your own Supabase project, connected in Project Settings → Connectors. Tables: `agents`, `mandates`, `channels`, `events`, and `user_roles` kept in its own table. Row-level security on every table.
- Routes: `/`, `/_authenticated/agents`, `/_authenticated/agents/$id`, a public `/a/$handle` page to check an agent, and `/api/public/verify/$handle`.
- Twilio key stored as a secret; incoming calls and texts reach a signature-checked address under `/api/public/twilio`.
- ID checks are cryptographically signed so a third party can confirm them without calling us.
