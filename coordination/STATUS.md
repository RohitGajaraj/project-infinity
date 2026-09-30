# Status board

Maintained by the supervisor. Kiro: read this before every task and do not edit it. Protocol is in
[`README.md`](README.md).

**Updated:** 2026-09-30 07:22 UTC · **`main` at:** `91a2c1b` · **Lovable has pulled:** `91a2c1b`

## Live system, verified by probe

| Check | Result | Evidence |
| --- | --- | --- |
| Migrations applied | 11/11. `0000` is Lovable's baseline; `0001`–`0010` mirror all 10 files in `supabase/migrations/` | `drizzle.__drizzle_migrations` hashes match `drizzle/migrations/*.sql` |
| Mirror fidelity | All 10 semantically identical to source. `0005` uses `create` where the source uses `create or replace`, with the same effect | Comment- and whitespace-normalised diff |
| Pending migrations | None | No source file lacks a mirror |
| Owner-identity grants (`0010`) | anon: no execute on any of the six functions. `finalize_owner_identity_session`: service_role only. Legacy `record_owner_attestation`: disabled | `has_function_privilege` on the live DB |
| Earlier boundaries | `record_signed_action` and `current_owner_attestation`: not callable by anon or authenticated. `verify_agent`: public, by design | Same probe |
| Tables | RLS on for `owner_attestations`, `owner_identity_sessions` and `owner_identity_events`; anon has no select | `has_table_privilege`, `relrowsecurity` |
| Production URL | **https://infinityalpha.lovable.app**. The old `infinity-unbound-core` slug was renamed and now returns 404 | Fetched `/.well-known/infinity-issuer.json` |
| Issuer key | `key_mode: provisional`. `INFINITY_ISSUER_JWK` and `INFINITY_ISSUER_SEED` are not set; `INFINITY_ISSUER_ORIGIN` is | Issuer metadata; Lovable's secret list (names only) |
| Didit secrets | `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`, `DIDIT_WORKFLOW_ID` and `DIDIT_ENVIRONMENT` are present in Lovable's store | Lovable's secret list (names only) |
| Didit webhook | Reachable on production. An unsigned POST gets the handler's own `401 {"error":"invalid_webhook"}`, so no sign-in wall is in front of it | `curl -X POST /api/webhooks/didit` |
| Quality gates on `91a2c1b` | tsc pass · lint 0 errors (7 existing warnings) · `bun test` 200/200 · build pass | Supervisor's clean clone |

## Blocked on the founder

1. **Publish `91a2c1b` to production.** The last publish was 06:01 UTC. `91a2c1b` (accepting signed
   Didit console test webhooks) landed at 07:02, so production almost certainly lacks it. Until it is
   published, a Didit console test webhook will be rejected. Publish from Lovable, or let the
   supervisor publish; Claude Code's auto mode currently blocks that step.
2. **Point Didit's V3 webhook destination at production:**
   `https://infinityalpha.lovable.app/api/webhooks/didit`. The preview domain returns 401 to
   everything, so a destination on the preview URL can never deliver.
3. **Then run the §18.5 acceptance:** one signed Didit console test, then one real sandbox flow.
4. **Before any real user relies on a credential:** run `bun run keygen` and put the result in
   `INFINITY_ISSUER_JWK` in Lovable's secret store. Production signs in provisional mode today.
5. **Reported by Lovable, not yet verified:** email confirmation is off (a launch blocker), and the
   security scan is out of date for this version.
6. **Local only:** the working tree's `.env` holds `DIDIT_*` values. They are uncommitted, and a local
   pre-commit hook now refuses to commit them. Move them to `.env.local`, which is gitignored.

## Needs Kiro

- **Nothing blocking.** Lovable suggested moving `/api/webhooks/didit` under `/api/public/`. Production
  shows the handler is already reachable, so **do not move it**. Moving it would also break the Didit
  destination.
- **Next work (DIRECTION §19.9):** item 1's sandbox flow is waiting on founder items 1–3. Item 2,
  mandate lifecycle (edit/reissue semantics, history, verifier-visible versioning), is unblocked.

## Open requests

None.

## Log

- 2026-09-30 07:22 UTC: Supervisor started. First audit of the live DB, grants, production URL,
  secrets and gates on `91a2c1b`, recorded above.
