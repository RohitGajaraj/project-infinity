<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

One rule per line, each with its reason. Newest decisions at the bottom of each block.

## Backend and data

- Backend is Lovable Cloud (founder approved 2026-09-29); keep schema standard SQL so it can be exported to a self-owned project later.
- Activity log is hash-chained by a database trigger (`agent_events.chain_event`) so edits break the chain.
- Public verification goes through the security-definer `verify_agent` function only — anon never reads tables directly.
- Schema changes land as timestamped SQL in `supabase/migrations/`, with GRANTs and RLS in the same file; the commit message starts with `DB MIGRATION NEEDED:` — we have no DB credentials, so Lovable applies them.
- **After Lovable applies a migration, probe the live database and confirm it matches intent.** Skipping this is how every gap in `DIRECTION.md` §9 survived a commit called "Completed phase 1 build".
- Public-facing server code uses the **publishable**-key client (`src/lib/supabase-public.server.ts`), not the service-role client, so a wrong RLS policy fails in development instead of being silently bypassed.
- **Narrow exception:** writing agent-signed entries to the log uses the **service-role** client, because `record_signed_action` is service_role-only. That is deliberate — see the next rule.
- **If a check lives in application code, the database function it guards must not be callable by anon.** Shipped and had to fix exactly this: `record_signed_action` verified Ed25519 in app code but was granted to anon, so anyone could bypass the server over REST and write forged authorship into the chained log. "The server validates first" is only true when the server is the *only possible caller*. Audit-log writes are privileged operations.
- `user_roles` is **deferred, not dropped** (2026-09-29): nothing in phase 1 has a second role, and an unused table invites a wrong policy. Revisit the moment any surface distinguishes roles — and never put a role column on `profiles`.

## Secrets

- **`.env` is tracked in git and is not gitignored.** Nothing sensitive is in it today (Supabase publishable keys are public by design), but **no real secret may ever be written there.** Real secrets live only in Lovable's secret store.
- **The issuer private key is never committed and never stored in the database**, so neither a repo leak nor a database compromise can mint credentials.
- **The issuing key needs no manual setup.** It resolves in four modes, strongest first: `explicit` (`INFINITY_ISSUER_JWK`), `seed` (`INFINITY_ISSUER_SEED`), `provisional` (derived from `SUPABASE_SERVICE_ROLE_KEY`), `insecure` (derived from a constant, local dev only). Deployments work with zero configuration and can be hardened later by setting one variable.
- **Derivation is deterministic, never random.** The edge runtime is multi-instance; a random per-instance key would sign credentials that fail against whichever instance served `/.well-known/jwks.json`. Never replace derivation with `generateIssuerKeypair()` at request time.
- **Provisional and insecure modes must be reported, never hidden.** `key_mode` and `provisional` appear in issuer metadata, in the credential response, in the `x-infinity-key-mode` header, and as a visible warning on the Verify page. Silently signing with a dev key is the one failure that would discredit the whole product.
- Before real users rely on a credential, set `INFINITY_ISSUER_JWK` (generate with `bun run keygen`) and `INFINITY_ISSUER_ORIGIN`. Paste the secret straight into the secret store — never into a file, a commit, or a chat log.
- Rotation invalidates every credential signed by the old key. Add the new key to the published set before retiring the old one.

## Cryptography and the trust claim

- Agent secret keys are Ed25519, generated in the owner's browser; only the public key is stored — we can never leak an agent's secret.
- Credentials are **VC-JWT**: a W3C-VC-shaped payload in a compact JWS signed with EdDSA, served from `/api/public/credential/$agentId`.
- Signing keys are published at `/.well-known/jwks.json`, with issuer discovery at `/.well-known/infinity-issuer.json`. `kid` is the RFC 7638 thumbprint, so the key names itself rather than being labelled by us.
- **A credential must be verifiable with no call to us.** Only *current status* may require a live call, which is what `credentialStatus` → `/api/public/status/$agentId` is for.
- `src/lib/jws.ts` and `src/lib/credential.ts` are **pure**: no dependencies, no `.server` imports, no secrets. A verifier must be able to vendor those two files. Do not import anything else into them.
- The Verify page runs the signature check **in the visitor's browser**. If our server asserted validity the verifier would still be trusting us, which is the posture we say makes a maker-issued ID worthless.
- If the issuer key is absent we return `503 issuer_not_configured` and the UI says the credential is unsigned. **Never degrade to an unsigned credential.**
- Never describe hash-chaining as "signing". Chaining proves the sequence was not edited *if you trust the database*; it does not establish authorship, and the operator can recompute the chain.

## Quality gates

- `bunx tsc --noEmit`, `bun run lint` (0 errors), `bun test`, `bun run build` must all pass before a push.
- Crypto paths require tests. Forgery cases are not optional: tampered claims, `alg: none`, wrong key, expired, not-yet-valid.
- Test files are excluded from `tsconfig.json` because Bun's global types conflict with the generated Supabase clients; `bun test` type-checks them at runtime.
- `src/integrations/**` and `src/routeTree.gen.ts` are generated and excluded from lint — never hand-edit them.
- Claims in the UI must be backed by code. A claim the repo cannot demonstrate is the documented failure mode of the previous project.

## Customer model and the handshake (reasoning: DIRECTION.md §10)

- **We sell to whoever is accountable for the agent. Verification is free for the business checking it — permanently.** Certificate-authority economics: the website pays, the browser checks free. Charging the verifier taxes the exact behaviour the network needs.
- **Never put an API key, account requirement, rate limit or paywall on `/api/public/verify/*`, `/api/public/status/*`, `/api/public/credential/*` or `/.well-known/*`.** Adoption cost for a verifier must stay lower than the cost of thinking about it.
- **A credential alone is a bearer token.** Any presenter can replay it, so identity is not established until the agent proves possession of the private key named inside the credential. Proof of possession is part of phase 1, not a later hardening step.
- Challenge nonces are **single-use and bound to the agent**, or step 3 of the handshake is replayable.
- **Verification is not authorization.** Inside the mandate is instant and needs no human, because the signed mandate *is* a pre-authorization. Outside it requires an owner decision and yields a signed approval receipt naming that specific action. Never make a verifier wait on a human to learn who an agent is.
- Ride existing standards rather than inventing a format: **RFC 9421 HTTP Message Signatures** for the envelope, DPoP-style proof of possession, and stay compatible with **Web Bot Auth**. Neutrality means being adoptable without adopting us.
- The three facts a verifier learns must stay independently checkable: *we issued the mandate* (signature), *the agent holds the key* (challenge response), *it is still live* (one status call). Only the third may require us.

## Positioning guardrails (evidence: DIRECTION.md §11)

- **Disclosure, never concealment.** Amazon blocked Meta's Muse citing *identity concealment*. Never build a feature whose purpose is to help an agent pass as human. The claim is "this is an agent, acting for a named accountable person, within these limits" — not "this is a person".
- **Ride UCP; never compete with it.** Shopify's agent profile is self-declared and answers *what can this agent do*. We answer *who is liable if it goes wrong*. Emit a UCP-compatible profile that references our credential.
- **Sell where the business wants the transaction.** Shopify-class merchants and the long tail, not Amazon-class gatekeepers who block for commercial reasons a credential cannot fix.
- **Never lead with "identity".** Lead with the outcome: the agent stops getting blocked, or for a consumer, it cannot overspend and can be killed instantly.
- **A self-issued reputation score is not neutral.** Grading our own customers repeats the flaw we say makes a maker-issued ID worthless. Any trust score must rest on cross-company, independently attested history.

## Scope and market (founder direction, 2026-09-29)

- **Global-first, not India-first.** Adoption is expected to arrive from Western markets, so provider and design choices are decided on **breadth of coverage and self-serve access**, with India included rather than centred. Regional depth is a tie-breaker, never the reason.
- **Stripe Identity is ruled out permanently**, and not on geography: their supported-use-cases terms prohibit reselling ID verification when that is your primary business, which is what Infinity is. Revisit only with written clearance from Stripe.
- **Everything we build is for agents.** Owner identity verification exists solely as **one field inside the agent's credential** — brokered to a provider, one screen, a verdict stored. We never build KYC dashboards, never handle documents, never store PII, and never sell verification to humans. If `identity-provider.server.ts` starts growing flows, it has drifted.
- **Why that field is not a drift:** without an accountable party, the credential asserts only that an agent exists, which is the self-issued position we call worthless and the reason Amazon gave for blocking Muse. The attestation is the accountability anchor, not a product line.
- **An attestation is operator-asserted and must always say so.** It carries issuer, method, assurance and date, plus `operatorAsserted: true`. A bare `verified` boolean is unfalsifiable, and a verifier must never be led to think it checked this claim itself. Same discipline as signing versus hash-chaining.
- **A provider verdict alone does not make an owner verified.** `verify_agent` derives standing from a live, unrevoked, unexpired attestation, so a lapsed check stops reading as verified with no backfill.
- **PII stripping is implemented, not asserted.** Provider webhooks carry extracted personal data by default; `stripPii` redacts it at the boundary before anything is logged or stored, matching on normalised field names so camelCase variants cannot slip through.

## Coordination: Kiro, supervisor, Lovable (protocol: `coordination/README.md`, 2026-09-30)

- **Git `main` is the only channel the three share.** Kiro builds and pushes; Lovable pulls, applies and publishes; a Claude Code supervisor holding the Lovable MCP relays between them, because Kiro and Lovable have no connection of their own.
- **Read `coordination/STATUS.md` before starting work.** It is the supervisor's verified view of the live system, so it is the only place that says a migration is actually live.
- **Anything that is not a migration goes in `coordination/requests/`** (secret, publish, Lovable task, question, decision). A commit subject can carry only one signal, and requests need a trackable status.
- **The supervisor owns `STATUS.md` and each request's `## Result`; Lovable edits nothing under `coordination/`.** Three writers on one branch conflict unless each file has a single owner.
- **The supervisor verifies by live probe, not by Lovable's report.** Lovable's "applied exactly as written" and Kiro's "the server validates first" are both claims until checked.
- **The supervisor reviews every migration and security-sensitive diff before relaying; a passing review is enough for Lovable to apply** (founder, 2026-09-30). Every earlier grant and cap defect was found only after it shipped, and a live migration is the hardest thing here to undo. Publishing still needs the founder.
- **Supervisor strategy critique arrives as `type: proposal`; Kiro acts on one only once it is `approved`.** Direction keeps one author, the founder, rather than two agents steering each other.
