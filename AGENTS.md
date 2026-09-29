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

- Backend is Lovable Cloud (founder approved 2026-09-29); keep schema standard SQL so it can be exported to a self-owned project later.
- Agent secret keys are Ed25519, generated in the owner's browser; only the public key is stored — we can never leak an agent's secret.
- Activity log is hash-chained by a database trigger (agent_events.chain_event) so edits break the chain.
- Public verification goes through the security-definer `verify_agent` function only — anon never reads tables directly.
