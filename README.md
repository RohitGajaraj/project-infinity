# Project Infinity

> _Last updated: 2026-09-30. Status: **the agent credential, owner-accountability flow, public
> verification, proof of possession, revocation, mandate enforcement and MCP security boundary are
> implemented. 200+ unit tests and live database/browser probes pass.** The next foundation item is
> mandate lifecycle and verifier-visible versioning (`DIRECTION.md` §19.9 item 2)._

> [!WARNING]
> **Competitive finding, 2026-09-29.** Baselayer announced a **$35M Series A on 2026-09-22** and
> launched a "Know Your Agent" Agentic Identity Suite: the layer letting banks, merchants and platforms
> verify which agent they are dealing with, who it represents, and whether it is authorised to act —
> **the same sentence as our §10** — on top of an existing network of **2,300 US financial
> institutions**. That is the two-sided cold start we named as our biggest risk, already solved for
> them. Separately, World's AgentKit (Altman-backed, launched 2026-03-17) holds the "cryptographic proof
> a real human stands behind this agent" claim.
>
> **Superseded:** §13's initial competitive response called identity and voice wedges. Founder direction
> in §14.4 and §19.9 parks channel expansion: the basement—accountability, mandate lifecycle, key
> lifecycle and approval evidence—must be strong before voice, email, wallet or connector packaging.

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

### Accountable-owner checks: Didit operator runbook

#### Decision and ownership

Didit is a replaceable evidence provider, not Infinity's product. It hosts document capture, ID
verification, liveness and face matching. Infinity owns the agent key, owner-to-agent delegation,
signed mandate, live status, proof of possession and approval evidence. The full rationale and exit
criteria are in `DIRECTION.md` §19.

The account's displayed name remains explicitly self-declared. A successful provider result means the
holder of the Infinity account completed the stated check; it does not prove that the displayed label
matches a document. Infinity stores only opaque attempt/session/event identifiers and the narrow
provider/method/assurance/date result—never document media, extracted personal fields or raw webhooks.

#### Should the founder sign up, or use the registration API?

**Sign up through the [Didit Business Console](https://business.didit.me) for the first organization.**
Use a founder-controlled company email and recovery path. The browser console is the right first setup
because the founder must own the organization, applications, billing, workflow review, webhook
destination and secret rotation.

Didit also supports a two-call [programmatic registration flow](https://docs.didit.me/integration/programmatic-registration),
but it still creates an account, organization and application after email-code verification. Reserve
that path for later automation; it is not a substitute for organizational ownership. Never paste a
Didit password, API key or webhook secret into this repository or chat.

#### Sandbox setup—do this first

1. **Create a sandbox Application.** In the Didit organization, create/select an Application whose
   mode is **Sandbox**. Applications have separate scoped API keys; sandbox and live must not share
   credentials. Copy the sandbox API key for the secret-store step below.
2. **Create and publish one person/KYC workflow.** In **Workflows → Create New**, choose a Simple KYC
   workflow and require all three evidence blocks:
   - ID Verification / document check
   - Liveness Detection
   - Face Match between the live person and document portrait

   Copy the published workflow UUID. Infinity refuses to record high assurance unless the signed V3
   webhook matches this exact UUID and reports approved `id_verifications[]`, `liveness_checks[]`, and
   `face_matches[]` results.
3. **Create a V3 webhook destination.** In the Application's **API & Webhooks / Integrate** area, add:
   - URL: `https://<your-public-infinity-origin>/api/webhooks/didit`
   - Webhook version: **V3**
   - Subscribed event: **`status.updated`**
   - Enabled: yes

   Save the destination's `secret_shared_key` when Didit shows it. This is the webhook secret and is
   different from the API key.
4. **Set Lovable secrets.** Paste values directly into Lovable's secret store—not `.env`, a commit, or
   chat:

   ```text
   DIDIT_API_KEY=<sandbox Application API key>
   DIDIT_WEBHOOK_SECRET=<destination secret_shared_key>
   DIDIT_WORKFLOW_ID=<published KYC workflow UUID>
   DIDIT_ENVIRONMENT=sandbox
   ```

   Also ensure `INFINITY_ISSUER_ORIGIN` is the same public HTTPS origin used in the destination URL,
   because Didit redirects the browser back to `/agents?identity=returned` on that origin.
5. **Apply the database migration before testing the UI.** Lovable must apply
   `supabase/migrations/20260930040000_owner_identity_flow.sql`, then regenerate its database types.
   The connected project applied it on 2026-09-30; keep this step for every fresh deployment.
6. **Test destination authentication.** Use Didit's **Try Webhook** action. Infinity should return 2xx
   for the signed test delivery but must not create an attestation from it.
7. **Run one real sandbox journey through Infinity.** Sign in to Infinity, open **Your agents**, and
   click **Check accountable owner**. Complete the hosted flow with Didit's sandbox **sample documents**
   and an approval scenario. Do not upload a real ID to sandbox: Didit mocks extraction and decisions,
   but its documentation says captured sandbox media is still stored.
8. **Confirm the evidence chain.** The console card should become **Attested** and name Didit, the
   method and high assurance. Open one agent's public Verify page and fetch a fresh credential; both
   must show the operator-asserted attestation while keeping the display name marked self-declared.
9. **Run the live owner-flow probe.** With the migrated database available, run
   `bun run e2e:identity`. It needs only the publishable Supabase key and checks RLS, auth-derived
   attempt ownership, duplicate start/bind idempotency, finalizer denial for public roles and the
   superseded recorder lockout. The broader `bun run e2e` additionally needs an app deployment whose
   server has the service-role secret; never copy that secret into a local file merely to run it.

Didit's [quick start](https://docs.didit.me/getting-started/quick-start) recommends hosted sessions;
[API authentication](https://docs.didit.me/getting-started/api-authentication) documents per-Application
keys; the [webhook contract](https://docs.didit.me/integration/webhooks) defines V3 signatures and
`status.updated`; and [sandbox testing](https://docs.didit.me/integration/sandbox-testing) documents
separate applications, scenarios and media handling. Content was rephrased for compliance with
licensing restrictions.

#### Promote to production only after sandbox passes

Create a **separate Live Application** in Didit. Recreate/publish the reviewed workflow and webhook
destination there, then replace the three Didit secrets with the live Application values and remove
`DIDIT_ENVIRONMENT=sandbox` (unset means `live`). Do not reuse sandbox API keys, workflow IDs or webhook
secrets. Before a real person relies on the credential, also complete the production issuer-key setup
in the preceding section.

Expected failure signals are deliberate:

- **Identity checks not configured** — one or more Didit secrets is absent.
- **Webhook 401** — signature, timestamp, environment or payload structure failed closed.
- **Webhook 409** — the opaque attempt and provider session do not match, or assurance evidence is
  inconsistent.
- **Check remains in progress** — the provider has not sent an accepted terminal `status.updated`
  event; inspect Didit's destination delivery log without copying payload PII into project logs.

Hosting and deploys are managed by [Lovable](https://lovable.dev/projects/a72c22cc-c399-46a1-ae47-ed7543f69c3a).
Pushes to `main` sync into the Lovable editor, so keep the branch working and never rewrite pushed history.

## House rule

**Four documents only** — this one, `DIRECTION.md`, `MARKETPLACE-REVIEW.md`, `AGENTS.md`. Extend one
rather than adding a file. Doc sprawl standing in for market contact is a documented failure mode here.
