# Coordination: Kiro ↔ Supervisor ↔ Lovable

Git `main` on GitHub is the only channel all three share. Kiro and Lovable never talk directly. The
supervisor (Claude Code, holding the Lovable MCP connection) relays between them and verifies the
result on the live system.

| Role | Who | Does | Does not |
| --- | --- | --- | --- |
| Builder | Kiro | Writes code, migrations and tests; pushes to `main` | Reach Lovable, the live database, secrets or publishing |
| Supervisor | Claude Code | Watches `main`, relays to Lovable's agent, probes the live DB read-only, reports back here | Write the DB, publish, or set secrets without the founder's approval |
| Platform | Lovable | Pulls `main`, applies migrations, regenerates types, holds secrets, publishes | Edit anything under `coordination/` |
| Founder | Rohit | Decides, enters secrets, approves publishing | — |

## The loop

1. **Kiro pushes.** A migration is a timestamped file in `supabase/migrations/` (with GRANTs and RLS),
   and the commit subject starts with `DB MIGRATION NEEDED:`. Anything Lovable or the founder needs to
   know goes in the commit body, and the supervisor forwards it verbatim.
2. **For anything that is not a migration** (a secret, a publish, a Lovable-side task, a question, a
   founder decision), Kiro also adds a request file in the same commit:
   `coordination/requests/<YYYYMMDD-HHMM>-<slug>.md`, using `TEMPLATE.md`.
3. **The supervisor picks it up** within minutes. It asks Lovable's agent to act, then verifies with a
   live probe. It does not take Lovable's word for it.
4. **The supervisor reports back** in a commit whose subject starts with `supervisor:`. It updates
   `STATUS.md`, and fills the `## Result` of each request it handled.
5. **Kiro pulls before starting any task** and reads `STATUS.md` first. Anything under
   *Blocked on the founder* or *Needs Kiro* takes priority over new work.

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
