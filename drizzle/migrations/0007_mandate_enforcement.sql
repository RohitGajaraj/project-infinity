-- Make the mandate enforceable instead of decorative.
--
-- Today the credential asserts "monthly spend limit $200, ask the owner above $50"
-- and nothing tracks, counts or gates anything. An agent can exceed its cap freely
-- and nobody knows, and `request_approval` reports that approvals do not exist. So
-- the central promise of the product — limits you can rely on — is unbacked, which
-- makes us an ID card rather than a control plane.
--
-- Three pieces:
--   1. agent_usage      an append-only ledger of what an agent has actually spent
--   2. approval_requests the human-in-the-loop gate, with the owner deciding
--   3. reserve_spend    ONE atomic operation that checks the cap and records
--
-- The atomicity in (3) is the whole point. Two concurrent requests for $150 against
-- a $200 cap must not both succeed, so the check and the write cannot be separate
-- statements. We take a row lock on the agent to serialise per-agent spend.
--
-- Safe to apply more than once.

-- ================================================================ 1. ledger
create table if not exists public.agent_usage (
  id          bigint      generated always as identity primary key,
  agent_id    uuid        not null references public.agents(id) on delete cascade,
  -- 'spend' counts against the cap. 'action' is recorded but not counted, so a
  -- non-financial action still leaves a trace.
  kind        text        not null default 'spend',
  amount_usd  numeric(12, 2) not null default 0,
  -- What it was for, as the owner will read it. Never PII.
  detail      text        not null default '',
  -- Caller-supplied idempotency key: a retried request must not double-charge.
  reference   text        not null,
  -- Set when the spend was authorised by an approval rather than by the mandate.
  approval_id bigint,
  created_at  timestamptz not null default now(),

  constraint agent_usage_kind_check check (kind in ('spend', 'action', 'refund')),
  constraint agent_usage_amount_check check (amount_usd >= 0 and amount_usd <= 1000000),
  constraint agent_usage_detail_len check (length(detail) <= 300),
  constraint agent_usage_reference_len check (length(reference) between 1 and 200)
);

-- Idempotency: the same reference for the same agent can only land once.
create unique index if not exists agent_usage_agent_reference_key
  on public.agent_usage (agent_id, reference);

create index if not exists agent_usage_agent_month_idx
  on public.agent_usage (agent_id, created_at desc);

alter table public.agent_usage enable row level security;

revoke all on public.agent_usage from anon, authenticated;
-- Owners read their own agents' usage; only the server writes it.
grant select on public.agent_usage to authenticated;

drop policy if exists "owner reads usage" on public.agent_usage;
create policy "owner reads usage"
  on public.agent_usage for select to authenticated
  using (exists (select 1 from public.agents a where a.id = agent_usage.agent_id and a.owner_id = auth.uid()));

comment on table public.agent_usage is
  'Append-only spend and action ledger. Written only by reserve_spend. `reference` is an idempotency key so a retry cannot double-charge.';

-- ============================================================= 2. approvals
create table if not exists public.approval_requests (
  id          bigint      generated always as identity primary key,
  agent_id    uuid        not null references public.agents(id) on delete cascade,
  action      text        not null,
  amount_usd  numeric(12, 2) not null default 0,
  status      text        not null default 'pending',
  -- Opaque handle the agent quotes when asking whether it was decided.
  reference   text        not null,
  requested_at timestamptz not null default now(),
  decided_at  timestamptz,
  -- Approvals are a licence to act now, not forever.
  expires_at  timestamptz not null default (now() + interval '24 hours'),
  -- Set once the approved amount has been drawn, so one approval funds one spend.
  consumed_at timestamptz,

  constraint approval_status_check check (status in ('pending', 'approved', 'denied', 'expired')),
  constraint approval_action_len check (length(action) between 1 and 500),
  constraint approval_amount_check check (amount_usd >= 0 and amount_usd <= 1000000),
  constraint approval_reference_len check (length(reference) between 1 and 200),
  -- A decided request must carry its decision time.
  constraint approval_decided_coherent check ((status in ('pending')) = (decided_at is null))
);

create unique index if not exists approval_requests_reference_key
  on public.approval_requests (reference);

create index if not exists approval_requests_agent_idx
  on public.approval_requests (agent_id, requested_at desc);

alter table public.approval_requests enable row level security;

revoke all on public.approval_requests from anon, authenticated;
-- SELECT only. Deciding goes through decide_approval, which re-checks ownership,
-- so a direct UPDATE grant would be surface we never use. Same rule that caught
-- record_signed_action and current_owner_attestation: grant only what is needed.
grant select on public.approval_requests to authenticated;

drop policy if exists "owner reads approvals" on public.approval_requests;
create policy "owner reads approvals"
  on public.approval_requests for select to authenticated
  using (exists (select 1 from public.agents a where a.id = approval_requests.agent_id and a.owner_id = auth.uid()));

-- Deliberately no update policy: see decide_approval.
drop policy if exists "owner decides approvals" on public.approval_requests;

comment on table public.approval_requests is
  'Human-in-the-loop gate for actions outside the mandate. An approval is a licence to act once, within 24 hours.';

-- ==================================================== 3. allowance, read-only
-- What a verifier or an agent may know without seeing the ledger: the cap and how
-- much of it is left. Deliberately no history — a merchant needs the headroom, not
-- a list of what else the agent bought this month.
create or replace function public.agent_allowance(_public_id text)
  returns table(
    monthly_limit_usd numeric,
    spent_this_month_usd numeric,
    remaining_usd numeric,
    approval_above_usd numeric,
    period_start timestamptz
  )
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  with a as (
    select id, monthly_spend_limit, approval_above
      from public.agents
     where public_id = _public_id
  ),
  spent as (
    select coalesce(sum(case when u.kind = 'refund' then -u.amount_usd else u.amount_usd end), 0) as total
      from public.agent_usage u, a
     where u.agent_id = a.id
       and u.kind in ('spend', 'refund')
       and u.created_at >= date_trunc('month', now())
  )
  select a.monthly_spend_limit::numeric,
         greatest(spent.total, 0),
         greatest(a.monthly_spend_limit::numeric - greatest(spent.total, 0), 0),
         a.approval_above::numeric,
         date_trunc('month', now())
    from a, spent
$function$;

revoke execute on function public.agent_allowance(text) from public;
grant execute on function public.agent_allowance(text) to anon, authenticated, service_role;

-- ================================================ 4. reserve spend, atomically
-- Returns a decision. Never raises for an ordinary refusal, because "you may not
-- spend this" is a normal answer an agent must handle, not an exception.
create or replace function public.reserve_spend(
  _public_id   text,
  _amount_usd  numeric,
  _detail      text,
  _reference   text,
  _approval_reference text default null
)
  returns table(allowed boolean, reason text, remaining_usd numeric, usage_id bigint)
  language plpgsql
  volatile
  security definer
  set search_path to 'public'
as $function$
DECLARE
  _agent      public.agents;
  _spent      numeric;
  _approval   public.approval_requests;
  _usage_id   bigint;
  _existing   public.agent_usage;
BEGIN
  IF _amount_usd IS NULL OR _amount_usd < 0 THEN
    RETURN QUERY SELECT false, 'invalid_amount', 0::numeric, NULL::bigint;
    RETURN;
  END IF;

  -- Row lock serialises concurrent spend for this agent, so two requests cannot
  -- both pass the cap check. This is the reason the whole operation is one function.
  SELECT * INTO _agent FROM public.agents WHERE public_id = _public_id FOR UPDATE;

  IF _agent.id IS NULL THEN
    RETURN QUERY SELECT false, 'unknown_agent', 0::numeric, NULL::bigint;
    RETURN;
  END IF;
  IF _agent.status <> 'valid' THEN
    RETURN QUERY SELECT false, 'agent_frozen', 0::numeric, NULL::bigint;
    RETURN;
  END IF;
  IF _agent.expires_at <= now() THEN
    RETURN QUERY SELECT false, 'agent_expired', 0::numeric, NULL::bigint;
    RETURN;
  END IF;

  -- Idempotency: a retried request returns the original outcome rather than
  -- charging twice. Checked after the lock so concurrent retries agree.
  SELECT * INTO _existing FROM public.agent_usage
   WHERE agent_id = _agent.id AND reference = _reference;
  IF _existing.id IS NOT NULL THEN
    SELECT coalesce(sum(case when kind = 'refund' then -amount_usd else amount_usd end), 0)
      INTO _spent FROM public.agent_usage
     WHERE agent_id = _agent.id AND kind IN ('spend', 'refund') AND created_at >= date_trunc('month', now());
    RETURN QUERY SELECT true, 'already_recorded',
                        greatest(_agent.monthly_spend_limit::numeric - greatest(_spent, 0), 0), _existing.id;
    RETURN;
  END IF;

  SELECT coalesce(sum(case when kind = 'refund' then -amount_usd else amount_usd end), 0)
    INTO _spent FROM public.agent_usage
   WHERE agent_id = _agent.id AND kind IN ('spend', 'refund') AND created_at >= date_trunc('month', now());
  _spent := greatest(_spent, 0);

  -- The hard ceiling. Nothing authorises exceeding it, not even an approval:
  -- the owner would have to raise the limit.
  IF _spent + _amount_usd > _agent.monthly_spend_limit::numeric THEN
    RETURN QUERY SELECT false, 'over_monthly_limit',
                        greatest(_agent.monthly_spend_limit::numeric - _spent, 0), NULL::bigint;
    RETURN;
  END IF;

  -- Above the threshold the mandate alone is not enough; a live approval for at
  -- least this amount must exist and be unconsumed.
  IF _agent.approval_above > 0 AND _amount_usd > _agent.approval_above::numeric THEN
    IF _approval_reference IS NULL THEN
      RETURN QUERY SELECT false, 'owner_approval_required',
                          greatest(_agent.monthly_spend_limit::numeric - _spent, 0), NULL::bigint;
      RETURN;
    END IF;

    SELECT * INTO _approval FROM public.approval_requests
     WHERE reference = _approval_reference AND agent_id = _agent.id
     FOR UPDATE;

    IF _approval.id IS NULL
       OR _approval.status <> 'approved'
       OR _approval.consumed_at IS NOT NULL
       OR _approval.expires_at <= now()
       OR _approval.amount_usd < _amount_usd THEN
      RETURN QUERY SELECT false, 'approval_invalid',
                          greatest(_agent.monthly_spend_limit::numeric - _spent, 0), NULL::bigint;
      RETURN;
    END IF;

    -- One approval funds one spend.
    UPDATE public.approval_requests SET consumed_at = now() WHERE id = _approval.id;
  END IF;

  INSERT INTO public.agent_usage (agent_id, kind, amount_usd, detail, reference, approval_id)
  VALUES (_agent.id, 'spend', _amount_usd, coalesce(_detail, ''), _reference, _approval.id)
  RETURNING id INTO _usage_id;

  -- Leave a trace in the chained log so the audit trail and the ledger agree.
  INSERT INTO public.agent_events (agent_id, kind, detail)
  VALUES (_agent.id, 'spend',
          'Spent $' || to_char(_amount_usd, 'FM999999990.00') ||
          case when coalesce(_detail, '') = '' then '' else ' — ' || _detail end);

  RETURN QUERY SELECT true, 'recorded',
                      greatest(_agent.monthly_spend_limit::numeric - (_spent + _amount_usd), 0), _usage_id;
END $function$;

revoke execute on function public.reserve_spend(text, numeric, text, text, text) from public;
revoke execute on function public.reserve_spend(text, numeric, text, text, text) from anon;
revoke execute on function public.reserve_spend(text, numeric, text, text, text) from authenticated;
-- service_role only: the server calls this after authenticating the agent. Exposing
-- it to anon would let anyone drain another agent's allowance.
grant execute on function public.reserve_spend(text, numeric, text, text, text) to service_role;

-- ============================================== 5. raise an approval request
create or replace function public.create_approval_request(
  _public_id  text,
  _action     text,
  _amount_usd numeric
)
  returns table(reference text, status text, expires_at timestamptz)
  language plpgsql
  volatile
  security definer
  set search_path to 'public', 'extensions'
as $function$
DECLARE
  _agent_id uuid;
  _ref      text;
BEGIN
  SELECT a.id INTO _agent_id FROM public.agents a
   WHERE a.public_id = _public_id AND a.status = 'valid' AND a.expires_at > now();

  IF _agent_id IS NULL THEN
    RAISE EXCEPTION 'unknown_or_unusable_agent' USING errcode = 'no_data_found';
  END IF;

  _ref := 'apr_' || encode(extensions.gen_random_bytes(16), 'hex');

  INSERT INTO public.approval_requests (agent_id, action, amount_usd, reference)
  VALUES (_agent_id, _action, coalesce(_amount_usd, 0), _ref);

  INSERT INTO public.agent_events (agent_id, kind, detail)
  VALUES (_agent_id, 'approval_requested', left(_action, 280));

  RETURN QUERY SELECT _ref, 'pending'::text, (now() + interval '24 hours')::timestamptz;
END $function$;

revoke execute on function public.create_approval_request(text, text, numeric) from public;
revoke execute on function public.create_approval_request(text, text, numeric) from anon;
revoke execute on function public.create_approval_request(text, text, numeric) from authenticated;
grant execute on function public.create_approval_request(text, text, numeric) to service_role;

-- ================================================ 6. read an approval's state
create or replace function public.approval_state(_public_id text, _reference text)
  returns table(status text, amount_usd numeric, action text, expires_at timestamptz, consumed boolean)
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  select case when r.status = 'pending' and r.expires_at <= now() then 'expired' else r.status end,
         r.amount_usd, r.action, r.expires_at, (r.consumed_at is not null)
    from public.approval_requests r
    join public.agents a on a.id = r.agent_id
   where r.reference = _reference and a.public_id = _public_id
$function$;

revoke execute on function public.approval_state(text, text) from public;
revoke execute on function public.approval_state(text, text) from anon;
revoke execute on function public.approval_state(text, text) from authenticated;
grant execute on function public.approval_state(text, text) to service_role;

-- ==================================================== 7. owner decides, logged
-- SECURITY DEFINER with an explicit ownership check, not `invoker`.
--
-- Definer is required because this writes to agent_events, which deliberately has
-- no insert policy — an append-only log its own subject can write is not an audit
-- log. But definer bypasses RLS, so authorisation has to be re-established in the
-- body: the caller must be the owner of the agent the request belongs to.
create or replace function public.decide_approval(_reference text, _approve boolean)
  returns table(status text)
  language plpgsql
  volatile
  security definer
  set search_path to 'public'
as $function$
DECLARE _row public.approval_requests;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = 'insufficient_privilege';
  END IF;

  UPDATE public.approval_requests r
     SET status = case when _approve then 'approved' else 'denied' end,
         decided_at = now()
   WHERE r.reference = _reference
     AND r.status = 'pending'
     AND r.expires_at > now()
     -- The authorisation check RLS would otherwise have made for us.
     AND EXISTS (
       SELECT 1 FROM public.agents a
        WHERE a.id = r.agent_id AND a.owner_id = auth.uid()
     )
  RETURNING r.* INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'approval_not_pending_or_not_yours' USING errcode = 'no_data_found';
  END IF;

  INSERT INTO public.agent_events (agent_id, kind, detail)
  VALUES (_row.agent_id,
          case when _approve then 'approval_granted' else 'approval_denied' end,
          left(_row.action, 280));

  RETURN QUERY SELECT _row.status;
END $function$;

revoke execute on function public.decide_approval(text, boolean) from public;
revoke execute on function public.decide_approval(text, boolean) from anon;
grant execute on function public.decide_approval(text, boolean) to authenticated, service_role;
