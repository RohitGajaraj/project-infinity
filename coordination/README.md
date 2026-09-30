# Coordination: Kiro ↔ Supervisor ↔ Lovable

Git `main` on GitHub is the only channel all three share. Kiro and Lovable never talk directly. The
supervisor (Claude Code, holding the Lovable MCP connection) relays between them and verifies the
result on the live system.

| Role | Who | Does | Does not |
| --- | --- | --- | --- |
| Builder | Kiro | Writes code, migrations and tests; pushes to `main` | Reach Lovable, the live database, secrets or publishing |
| Supervisor | Claude Code | Watches `main`; reviews migrations and security-sensitive diffs; relays to Lovable's agent; probes the live DB read-only; reports back here; critiques direction and files proposals to the founder | Publish, set secrets, or write the DB directly without the founder's approval. Proposals do not bind Kiro until the founder approves them |
| Platform | Lovable | Pulls `main`, applies migrations, regenerates types, holds secrets, publishes | Edit anything under `coordination/` |
| Founder | Rohit | Decides, enters secrets, approves publishing | — |

## The loop

1. **Kiro pushes.** A migration is a timestamped file in `supabase/migrations/` (with GRANTs and RLS),
   and the commit subject starts with `DB MIGRATION NEEDED:`. Anything Lovable or the founder needs to
   know goes in the commit body, and the supervisor forwards it verbatim.
2. **For anything that is not a migration** (a secret, a publish, a Lovable-side task, a question, a
   founder decision), Kiro also adds a request file in the same commit:
   `coordination/requests/<YYYYMMDD-HHMM>-<slug>.md`, using `TEMPLATE.md`.
3. **The supervisor reviews, then relays** within minutes. Every migration and every
   security-sensitive diff (below) is reviewed first.
   - **Review passes:** the supervisor asks Lovable to apply it, with no further founder sign-off
     needed (founder decision, 2026-09-30). It then verifies with a live probe, and does not take
     Lovable's word for it.
   - **Review finds a blocking defect:** nothing is relayed. The findings go under **Needs Kiro** in
     `STATUS.md`, and Kiro ships a fix as a new commit.
4. **The supervisor reports back** in a commit whose subject starts with `supervisor:`. It updates
   `STATUS.md`, and fills the `## Result` of each request it handled.
5. **Kiro pulls before starting any task** and reads `STATUS.md` first. Anything under
   *Blocked on the founder* or *Needs Kiro* takes priority over new work.

## Review gate

**Reviewed before relay or publish:** `supabase/migrations/**`; `src/lib/jws.ts`,
`src/lib/credential.ts` and `src/lib/*.server.ts`; `src/routes/api/**`, `src/routes/mcp.ts` and the
`/.well-known/*` routes; and any diff containing `grant`, `revoke`, `security definer` or RLS.

**Against:** the rules in `AGENTS.md`; anon/authenticated reachability of every new function and
table; replay, freshness and signature ordering; and whether a UI or doc claim is backed by code.

**Verdicts:** recorded in `STATUS.md` under **Reviews** as `PASS`, `PASS with notes` (non-blocking,
listed for Kiro) or `BLOCK` (not relayed).

## Proposals: strategy critique

The supervisor also critiques direction. Its output is a proposal, not an instruction. A proposal is a
request file with `from: supervisor`, `to: founder` and `type: proposal`, at `status: proposed`.

- **Kiro acts on a proposal only once its status is `approved`.** The founder approves it to the
  supervisor, which flips the status and says so in `STATUS.md`. Direction keeps one author, the
  founder.
- **To disagree:** Kiro files its own request (`to: supervisor`, `type: question`) that links to the
  proposal, and does not edit the proposal. Both views then reach the founder.

## Rules

- **`supabase/migrations/` is the source of truth.** Lovable mirrors each migration into
  `drizzle/migrations/NNNN_*.sql` to apply it. The supervisor checks that each mirror is semantically
  identical to its source. If Lovable finds a defect, it reports it and does not fix it in its copy.
  Kiro then ships a new migration.
- **Pending migration = a source file with no matching mirror.** The supervisor detects this from the
  tree whatever the commit message says, so a missing prefix cannot strand one.
- **Kiro never edits a request after its `status` leaves `open`.** Only the supervisor writes
  `STATUS.md` and `## Result` sections. That is what keeps the three writers from producing merge
  conflicts on `main`.
- **No secret values, ever, in this folder, in a commit, or in a message to Lovable.** Name the
  secret; the founder types the value into Lovable's secret store.
- **Never rewrite published history** (see AGENTS.md). Merge; never force-push, rebase or amend what
  is pushed.
