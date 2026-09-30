---
inclusion: always
---

# A supervisor relays your work to Lovable

You cannot reach Lovable, the live database, the secret store or publishing. A supervisor (Claude
Code, with a Lovable MCP connection, acting for the founder) watches `main` on GitHub. It relays
anything you push to Lovable's agent, verifies the result on the live system, and reports back
through git. The full protocol is in `coordination/README.md`.

## Before every task

1. `git pull` (merge; never rebase or force-push published commits).
2. Read `coordination/STATUS.md`. Items under **Needs Kiro** come before new work. Do not start work
   that depends on something listed under **Blocked on the founder**; pick the next unblocked item.

## When you need Lovable or the founder to act

- **A schema change:** add a timestamped file to `supabase/migrations/` with its GRANTs and RLS, and
  start the commit subject with `DB MIGRATION NEEDED:`. Put anything Lovable should know (deliberate
  choices that look like mistakes, expected test results) in the commit body; the supervisor forwards
  it verbatim. The supervisor applies nothing by hand, and the founder approves every live write.
- **Anything else** (a secret, a publish, a Lovable-side task, a question, a founder decision): in the
  same commit, add `coordination/requests/<YYYYMMDD-HHMM>-<slug>.md` from
  `coordination/TEMPLATE.md`. Say how the supervisor can prove it is done.
- **Never** write a secret value into the repo, a commit, `.env` or a request. Name the secret; the
  founder enters the value. A local pre-commit hook refuses to commit `.env` with non-public keys.

## Do not

- Edit `coordination/STATUS.md`, or a request whose `status` is no longer `open`. The supervisor owns
  them, and editing them causes merge conflicts on `main`.
- Treat "the migration is in git" as "the migration is live". It is live only once `STATUS.md` shows
  it verified.
