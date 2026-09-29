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
- `user_roles` is **deferred, not dropped** (2026-09-29): nothing in phase 1 has a second role, and an unused table invites a wrong policy. Revisit the moment any surface distinguishes roles — and never put a role column on `profiles`.

## Secrets

- **`.env` is tracked in git and is not gitignored.** Nothing sensitive is in it today (Supabase publishable keys are public by design), but **no real secret may ever be written there.** Real secrets live only in Lovable's secret store.
- The issuer private key is `INFINITY_ISSUER_JWK`, a single Ed25519 private JWK. It never touches the database, so a database compromise cannot mint credentials.
- Generate issuer keys with `bun run keygen` and paste the secret straight into the secret store — never through a file, a commit, or a chat log.

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
