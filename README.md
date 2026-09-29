# Project Infinity

> _Last updated: 2026-09-29. Status: **Agent ID + the MCP surface work end to end — an agent can now
> use Infinity. 100 unit tests, 40 live end-to-end checks (`bun run e2e`).** Remaining phase-1 gap:
> owner identity verification ([`DIRECTION.md` §9](./DIRECTION.md) G4). Focus is deliberately narrow —
> see §14.4._

> [!WARNING]
> **Competitive finding, 2026-09-29.** Baselayer announced a **$35M Series A on 2026-09-22** and
> launched a "Know Your Agent" Agentic Identity Suite: the layer letting banks, merchants and platforms
> verify which agent they are dealing with, who it represents, and whether it is authorised to act —
> **the same sentence as our §10** — on top of an existing network of **2,300 US financial
> institutions**. That is the two-sided cold start we named as our biggest risk, already solved for
> them. Separately, World's AgentKit (Altman-backed, launched 2026-03-17) holds the "cryptographic proof
> a real human stands behind this agent" claim.
>
> **Resolved in [`DIRECTION.md` §13](./DIRECTION.md):** identity is the wedge, **infrastructure is the
> business.** Baselayer sells a *check* to the receiving institution; we issue the *identity and the
> rails* to the accountable party and let anyone check for free. A fraud-intelligence company will not
> become a telco, which is why the **voice channel is the wedge** — it is the one documented pain
> (Meta pays humans because businesses hang up), it has no competitor because there is no HTTP header on
> a phone call, and it needs the business to integrate **nothing**, so it works with one customer and
> zero verifiers. Every line of code already written is the mechanism and is reused unchanged.

**Infinity is the neutral trust layer for AI agents.** An agent built with anything — Claude Code,
ChatGPT, Instinct, Muse, Cursor, or a company's own stack — gets what a person has: a verified identity
tied to an accountable human or company, a permission slip, its own email and phone number, a wallet
with limits, a track record, insurance, and an off switch. Any business can check that identity in one
call before dealing with it.

**One-line pitch:** *"The passport, bank account and phone line for AI agents, trusted by every business
because we don't make agents."*

We never build a vertical agent. An agent booking flights, filing taxes or writing code uses the same
ID, limits, wallet and receipts. Industry differences are settings on the permission slip, never
separate products.

**Who pays, settled ([`DIRECTION.md` §10](./DIRECTION.md)):** we sell to whoever is **accountable for
the agent** — an agent platform first (B2B, in volume), an individual later (B2C). **Checking an agent
is free, unmetered and zero-integration for the business doing the checking, permanently.** That is
certificate-authority economics: the website pays, the browser checks free. Charging the verifier would
tax the exact behaviour the network needs.

## Read in this order

| File | What it settles |
| --- | --- |
| [`DIRECTION.md`](./DIRECTION.md) | **§8 is the approved plan** (supersedes §0 and §4). **§9 is the phase-1 gap analysis and build order. §10 settles who the customer is and how the verification handshake works — read it before building anything.** §1–§7 are the reasoning and ruled-out directions, kept as evidence |
| [`AGENTS.md`](./AGENTS.md) | Technical decisions that bind. One rule plus a one-line reason |
| [`MARKETPLACE-REVIEW.md`](./MARKETPLACE-REVIEW.md) | Why an agent marketplace was declined, with sizing and the player landscape. Its §6 finding — supply is oversupplied, demand is scarce — drives the phase-1 metric |

**Why this exists, in one piece of evidence** (`DIRECTION.md` §11.1): Amazon blocked Meta's Muse agent
from its store on 2026-09-20, citing **identity concealment** — and businesses hang up on Muse's phone
calls often enough that Meta now pays trained humans to place them instead. The best-funded consumer
agent in the world is being blocked for want of a credential a stranger will accept.

**Who to sell to** (§11.2): Shopify-class merchants and the long tail, who *want* the transaction and
only need to know who is on the other end. **Never Amazon-class gatekeepers** — they block for
commercial reasons, and no credential fixes that.
| `.lovable/plan/*.md` | The archived approved plan, verbatim |

## Phases — one at a time, each must work before the next starts

| Phase | Ships | Done when |
| --- | --- | --- |
| **1. ID + Verify** _(now)_ | Agent ID, owner limits, offline-verifiable signed credential, proof of possession, public Verify page, chained log, off switch, MCP + API | **One business completes the full handshake — credential, challenge, proof of possession, status — against an agent it does not own, in under a second, in its own codebase** (`DIRECTION.md` §10.7) |
| 2. Email | Per-agent inbox, every message signed | Agents send and receive real email |
| 3. Phone | Numbers, SMS, calls, marked as a verified agent | An agent calls a business and passes verification |
| 4. Wallet | Virtual cards via a licensed partner, limits, approvals | First real payments |
| 5. Track record + insurance | Trust score, refund reserve, then an insurance partner | First claim paid |

## Where this came from

Supaprod (`../Supaprod`) was stopped on 2026-09-23 by founder ruling R-42 after three months, 630k
lines and zero external users. Its post-mortem is `Supaprod/docs/strategy/strategy-reset-2026-09.md`.
**The lesson that shapes this repo: the failure was not code quality — it was building substituted for
finding out.** A second lesson from the same file governs how we verify: on 2026-08-02 nine shipped
features were found doing nothing in production, and none was found by reading code. They were found by
querying the live database. **A green typecheck is evidence the code compiles, and nothing more.**

## Architecture

- **TanStack Start v1** (React 19, Vite 8) on a Cloudflare Workers-style edge. No Node-only packages.
- **Backend is Lovable Cloud** (Supabase-compatible Postgres + auth). Lovable owns the database,
  hosting and deploys.
- Server logic in `src/lib/*.functions.ts` via `createServerFn`; public endpoints under
  `src/routes/api/public/*`.
- Agent secret keys are **Ed25519, generated in the owner's browser** — only the public key is stored.
- Public verification goes through the security-definer `verify_agent` function; anon never reads tables.

### Database changes

We have **no database credentials** — Lovable applies them. So:

1. Schema changes land as timestamped standard SQL in `supabase/migrations/`, including GRANTs and RLS.
2. The commit message starts with `DB MIGRATION NEEDED:` and explains it in plain language.
3. Lovable applies it, then **we probe the live database to confirm the applied state matches intent.**
   Step 3 is not optional; skipping it is how `DIRECTION.md` §9's gaps survived a commit called
   "Completed phase 1 build."

## Development

```sh
bun install
bun run dev      # vite dev on :8080
bunx tsc --noEmit
bun run lint
bun run build
```

Never edit (generated): `src/integrations/supabase/*`, `src/routeTree.gen.ts`, `.env`,
`supabase/config.toml`. Colours only via semantic tokens in `src/styles.css`.

### The issuing key

Credential signing works with **no configuration** — the key is derived deterministically from
whatever secret material the environment already has, and the deployment reports which mode it is in:

| Mode | Source | Production-grade |
| --- | --- | --- |
| `explicit` | `INFINITY_ISSUER_JWK` | Yes |
| `seed` | `INFINITY_ISSUER_SEED` | Yes |
| `provisional` | derived from `SUPABASE_SERVICE_ROLE_KEY` | No — fine while building |
| `insecure` | derived from a constant in the source | No — local dev; the seed is public |

Check which one a deployment is using at `/.well-known/infinity-issuer.json` (`key_mode`). Anything
provisional shows a visible warning on the Verify page and sets `x-infinity-key-mode` on the
credential response, so a development key can never pass for a real one.

**Before real users:** run `bun run keygen`, set `INFINITY_ISSUER_JWK` in Lovable's secret store, and
set `INFINITY_ISSUER_ORIGIN` to the canonical production origin. Derivation is deterministic on
purpose — the edge runtime is multi-instance, so a random per-request key would sign credentials that
fail against whichever instance served the key set.

Hosting and deploys are managed by [Lovable](https://lovable.dev/projects/a72c22cc-c399-46a1-ae47-ed7543f69c3a).
Pushes to `main` sync into the Lovable editor, so keep the branch working and never rewrite pushed history.

## House rule

**Four documents only** — this one, `DIRECTION.md`, `MARKETPLACE-REVIEW.md`, `AGENTS.md`. Extend one
rather than adding a file. Doc sprawl standing in for market contact is a documented failure mode here.
