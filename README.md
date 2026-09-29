# Project Infinity

> _Last updated: 2026-09-29. Status: **phase 1 (Agent ID + Verify) in progress — working console and
> Verify page; the cryptographic trust layer is being built now.** Gap analysis: [`DIRECTION.md` §9](./DIRECTION.md)._

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

## Read in this order

| File | What it settles |
| --- | --- |
| [`DIRECTION.md`](./DIRECTION.md) | **§8 is the approved plan** (supersedes §0 and §4). **§9 is the current phase-1 gap analysis and build order.** §1–§7 are the reasoning and the ruled-out directions, kept as evidence |
| [`AGENTS.md`](./AGENTS.md) | Technical decisions that bind. One rule plus a one-line reason |
| [`MARKETPLACE-REVIEW.md`](./MARKETPLACE-REVIEW.md) | Why an agent marketplace was declined, with sizing and the player landscape. Its §6 finding — supply is oversupplied, demand is scarce — drives the phase-1 metric |
| `.lovable/plan/*.md` | The archived approved plan, verbatim |

## Phases — one at a time, each must work before the next starts

| Phase | Ships | Done when |
| --- | --- | --- |
| **1. ID + Verify** _(now)_ | Agent ID, owner limits, offline-verifiable signed credential, public Verify page, chained log, off switch, MCP + API | **One business performs a real verification check in a real flow** (revised — see `DIRECTION.md` §9 C1) |
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

Hosting and deploys are managed by [Lovable](https://lovable.dev/projects/a72c22cc-c399-46a1-ae47-ed7543f69c3a).
Pushes to `main` sync into the Lovable editor, so keep the branch working and never rewrite pushed history.

## House rule

**Four documents only** — this one, `DIRECTION.md`, `MARKETPLACE-REVIEW.md`, `AGENTS.md`. Extend one
rather than adding a file. Doc sprawl standing in for market contact is a documented failure mode here.
