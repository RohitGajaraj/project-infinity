# Project Infinity

> _Last updated: 2026-09-29. Status: **direction changed to the agent trust layer (DIRECTION.md §8); phase 1 in progress.**_

The codebase is an unmodified Lovable TanStack Start scaffold. **The only real content in this repo
right now is the decision about what to build.** Read these two files before touching code.

| File | What it settles |
| --- | --- |
| [`DIRECTION.md`](./DIRECTION.md) | **What to build, why, and the 14-day test that kills or continues it.** The recommendation, the eight-test filter every idea has to pass, the candidates ruled out with dated evidence, and the kill criteria |
| [`MARKETPLACE-REVIEW.md`](./MARKETPLACE-REVIEW.md) | **Why the "Hugging Face for agents" marketplace direction was declined**, with TAM/SAM/SOM, the player landscape, and the part of that instinct that survived |

## Where this came from

Supaprod (`../Supaprod`) was stopped on 2026-09-23 by founder ruling R-42 after three months, 630k
lines and zero external users. Its post-mortem lives at
`Supaprod/docs/strategy/strategy-reset-2026-09.md` — §14 holds the ruling and the seven constraints
any new direction has to meet. That file is the input to `DIRECTION.md`; it is not superseded and it
is worth re-reading before reopening any of this.

**The lesson that shapes this repo:** the failure was not code quality. It was three months of
building substituted for two days of finding out. So the next milestone here is 25 real users and 3
payments, not a feature.

## The decision, in three lines

Build **independent verification of finished work** — drop in an artifact plus its sources, get every
claim and number marked verified / unsupported / contradicted against the exact source span, plus a
link the recipient can open. Horizontal by construction; verticals are check libraries. First wedge
is **numbers only**.

Declined: agent marketplace and creator-payout economy (catalog layer standardised by an 11-company
coalition in June 2026; GPT Store proved the payout model fails; agent-token economies down >90%).
Declined: blockchain, until a cross-platform royalty ledger is the actual product.
Declined: the "prove you're human" trust layer — real market, but Zoom shipped World ID in April 2026,
detection decays as models improve, and no expression of it is falsifiable in 14 days. Seven variants
scored in [`DIRECTION.md` §3.1](./DIRECTION.md); the thread that survived is independence, which is
already the direction above.

## Where we stopped

Nothing is built. Days 1–2 of the plan in `DIRECTION.md` §5 are deliberately **no code**: 30 messages,
5 calls, and 3 hand-made verification reports on real documents. That is the next action, and it does
not happen in this repo.

When day 3 arrives, the build is exactly: upload artifact + sources → numeric claim extraction →
span-level match → one verdict page → a public share link. No auth tiers, no workspaces, no design
system project.

## Development

Deps are locked with Bun (`bun.lock`, and `bunfig.toml` sets a supply-chain guard). npm also works.

```sh
bun install
bun run dev      # vite dev
bun run lint
bun run build
```

Hosting and deploys are managed by [Lovable](https://lovable.dev/projects/a72c22cc-c399-46a1-ae47-ed7543f69c3a).
Pushes to `main` sync back into the Lovable editor, so keep the branch in a working state and do not
rewrite pushed history.

## House rule

**Three documents, and no fourth until there are 25 real users.** The two decision docs plus this
front door are the whole permitted surface; extend one of them rather than adding a file. The
documented failure mode is doc and code sprawl standing in for market contact.
