-- Fixes found by an adversarial review of 20260929230000_mandate_enforcement.sql.
-- Two of them defeat the spending cap outright. Ordered by severity.
--
-- Safe to apply more than once.

-- ============================================================================
-- S1-A. Idempotency key reuse authorised an arbitrary amount.
-- ============================================================================
-- On a reference match, reserve_spend returned allowed=true WITHOUT comparing the
-- amount to the recorded one, and the MCP layer told the agent verbatim: "nothing
-- was charged again. You may proceed."
--
--   record_spend($1,    reference "order-1")  -> recorded, $1 counted
--   record_spend($5000, reference "order-1")  -> allowed, $0 counted
--
-- The reference is agent-supplied and arbitrary, so this is an unbounded,
-- single-threaded, agent-controlled bypass of the entire cap. A replay must only
-- be treated as idempotent when it is genuinely the same charge.
--
-- S1-B. Deadlock with decide_approval on the happy path.
-- ============================================================================
-- reserve_spend took FOR UPDATE on agents, then locked approval_requests.
-- decide_approval updates approval_requests, then inserts into agent_events —
-- whose FK to agents(id) takes a FOR KEY SHARE lock on the same agent row, which
-- conflicts with FOR UPDATE. That is a cycle, and it is reached whenever the owner
-- approves at the moment the agent retries the spend, which is exactly what our
-- own polling guidance tells the agent to do.
--
-- FOR NO KEY UPDATE self-conflicts, so two concurrent reserve_spend calls still
-- mutually exclude and the cap guarantee is untouched, but it does not conflict
-- with FOR KEY SHARE, so child-table FK checks stop blocking. It also removes a
-- throughput cliff: under FOR UPDATE, one open spend blocked every concurrent
-- insert into agent_events, agent_usage, approval_requests and agent_challenges
-- for that agent.

-- Several smaller fixes are folded in; each is commented where it appears.

-- ---------------------------------------------------------------- integrity
-- The chained log could fork: chain_event reads the previous hash with no lock, so
-- two concurrent inserts for one agent can both claim the same prev_hash. Inside
-- reserve_spend the old FOR UPDATE hid this by accident — and switching to
-- FOR NO KEY UPDATE would expose it. Make a fork an error rather than silent
-- corruption. Per-agent, so 'genesis' across different agents is fine.
create unique index if not exists agent_events_agent_prev_hash_key
  on public.agent_events (agent_id, prev_hash);

-- approval_id claimed to be the authorisation for a spend while referencing
-- nothing. That is the one field an auditor would rely on.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agent_usage_approval_fk') then
    alter table public.agent_usage
      add constraint agent_usage_approval_fk
      foreign key (approval_id) references public.approval_requests(id) on delete set null;
  end if;
end $$;

-- The subject of the audit log could erase it. agent_usage, approval_requests and
-- agent_events all cascade from agents, and `authenticated` held DELETE on agents.
-- "An append-only log its own subject can write is not an audit log" applies more
-- strongly to deletion. Freezing is how an agent is retired.
revoke delete on public.agents from authenticated;
drop policy if exists "owner delete agents" on public.agents;

-- Same revokes the earlier migration bothered to make, for the two new sequences.
revoke all on sequence public.agent_usage_id_seq from anon, authenticated;
revoke all on sequence public.approval_requests_id_seq from anon, authenticated;

-- A refund must not be able to invent headroom: nothing linked it to the charge it
-- reverses, so a forged or duplicated refund row was a direct cap bypass for
-- whoever implements refunds next. Cheap to constrain now, while the table is empty.
alter table public.agent_usage
  add column if not exists reverses_usage_id bigint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agent_usage_reverses_fk') then
    alter table public.agent_usage
      add constraint agent_usage_reverses_fk
      foreign key (reverses_usage_id) references public.agent_usage(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'agent_usage_refund_shape') then
    alter table public.agent_usage
      add constraint agent_usage_refund_shape
      check ((kind = 'refund') = (reverses_usage_id is not null));
  end if;
end $$;

-- One refund per charge.
create unique index if not exists agent_usage_reverses_once_key
  on public.agent_usage (reverses_usage_id)
  where reverses_usage_id is not null;

-- consumed_at only means something on an approved request.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'approval_consumed_only_when_approved') then
    alter table public.approval_requests
      add constraint approval_consumed_only_when_approved
      check (consumed_at is null or status = 'approved');
  end if;
end $$;

-- 'expired' was allowed by the status check but forbidden by the coherence check,
-- so any future sweeper writing it would fail. approval_state derives expiry at
-- read time and never stores it, so drop the unreachable value instead of
-- loosening the coherence rule.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'approval_status_check') then
    alter table public.approval_requests drop constraint approval_status_check;
  end if;
  alter table public.approval_requests
    add constraint approval_status_check check (status in ('pending', 'approved', 'denied'));
exception when others then
  -- If existing rows hold 'expired', leave the looser check in place rather than
  -- failing the migration; nothing writes that value today.
  null;
end $$;

-- ------------------------------------------------- approval_above semantics
-- 0 was overloaded to mean "no gate", so an owner setting "require approval above
-- $0" — meaning ALWAYS ask me — got the exact opposite: never ask, spend freely to
-- the cap. A silent inversion of a safety control.
--
-- Fix: the column becomes nullable, NULL means no gate, and 0 now means always
-- require approval. Existing 0 rows are migrated to NULL so current behaviour is
-- preserved exactly.
alter table public.agents alter column approval_above drop not null;
update public.agents set approval_above = null where approval_above = 0;
alter table public.agents alter column approval_above drop default;

comment on column public.agents.approval_above is
  'Amount above which the owner must approve. NULL means no approval gate. 0 means every spend requires approval.';

-- ============================================================== allowance
-- It reported healthy headroom for a frozen or expired agent. reserve_spend
-- re-checks, so it was not exploitable — but a merchant reading allowance to
-- decide whether to proceed would be reading the allowance of an agent that has
-- been killed, and "can be killed instantly" is a headline claim.
--
-- Also pins the month boundary to UTC. date_trunc on a timestamptz resolves using
-- the session TimeZone, and reserve_spend (service_role) and agent_allowance
-- (anon) run on different clients — so they could disagree about which month it
-- is, concentrated in the first and last hours of a month.
drop function if exists public.agent_allowance(text);

create or replace function public.agent_allowance(_public_id text)
  returns table(
    monthly_limit_usd numeric,
    spent_this_month_usd numeric,
    remaining_usd numeric,
    approval_above_usd numeric,
    period_start timestamptz,
    usable boolean,
    status text
  )
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  with a as (
    select id, monthly_spend_limit, approval_above, status, expires_at
      from public.agents
     where public_id = _public_id
  ),
  spent as (
    select coalesce(sum(case when u.kind = 'refund' then -u.amount_usd else u.amount_usd end), 0) as total
      from public.agent_usage u, a
     where u.agent_id = a.id
       and u.kind in ('spend', 'refund')
       and u.created_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'
  )
  select a.monthly_spend_limit::numeric,
         greatest(spent.total, 0),
         -- A frozen or expired agent has no spendable allowance, whatever the cap says.
         case when a.status = 'valid' and a.expires_at > now()
              then greatest(a.monthly_spend_limit::numeric - greatest(spent.total, 0), 0)
              else 0::numeric end,
         a.approval_above::numeric,
         date_trunc('month', now() at time zone 'UTC') at time zone 'UTC',
         (a.status = 'valid' and a.expires_at > now()),
         a.status
    from a, spent
$function$;

revoke execute on function public.agent_allowance(text) from public;
grant execute on function public.agent_allowance(text) to anon, authenticated, service_role;

-- ============================================================ reserve_spend
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
  _amount     numeric;
  _period     timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
BEGIN
  -- Validate everything the table's CHECK constraints would otherwise reject, so a
  -- caller mistake is a refusal rather than a 500 out of a function whose contract
  -- is that ordinary refusals are return values.
  IF _reference IS NULL OR length(_reference) < 1 OR length(_reference) > 200 THEN
    RETURN QUERY SELECT false, 'invalid_reference', 0::numeric, NULL::bigint;
    RETURN;
  END IF;

  -- `NOT (x >= 0)` rather than `x < 0`, because NaN orders above all numbers and
  -- would pass the naive test. Fails closed by construction.
  IF _amount_usd IS NULL OR NOT (_amount_usd >= 0) OR _amount_usd > 1000000 THEN
    RETURN QUERY SELECT false, 'invalid_amount', 0::numeric, NULL::bigint;
    RETURN;
  END IF;

  -- Decide on exactly the value that will be stored. Previously the check used the
  -- unrounded amount and the INSERT stored it rounded, so the ledger could exceed
  -- what was authorised and `remaining` disagreed with a later allowance read.
  _amount := round(_amount_usd, 2);
  IF _amount <> _amount_usd THEN
    RETURN QUERY SELECT false, 'amount_not_in_cents', 0::numeric, NULL::bigint;
    RETURN;
  END IF;

  -- FOR NO KEY UPDATE, not FOR UPDATE: it still self-conflicts, so the per-agent
  -- mutex and the cap guarantee hold, but it does not conflict with the FOR KEY
  -- SHARE locks that child-table FK checks take. See S1-B above.
  SELECT * INTO _agent FROM public.agents WHERE public_id = _public_id FOR NO KEY UPDATE;

  IF NOT FOUND THEN
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

  SELECT coalesce(sum(case when kind = 'refund' then -amount_usd else amount_usd end), 0)
    INTO _spent FROM public.agent_usage
   WHERE agent_id = _agent.id AND kind IN ('spend', 'refund') AND created_at >= _period;
  _spent := greatest(_spent, 0);

  -- Idempotency, now bound to the amount. A replay is only the same charge if it is
  -- for the same money; anything else is a reused reference and must be refused,
  -- or the cap can be bypassed without limit (S1-A).
  SELECT * INTO _existing FROM public.agent_usage
   WHERE agent_id = _agent.id AND reference = _reference;
  IF FOUND THEN
    IF _existing.kind = 'spend' AND _existing.amount_usd = _amount THEN
      RETURN QUERY SELECT true, 'already_recorded',
                          greatest(_agent.monthly_spend_limit::numeric - _spent, 0), _existing.id;
    ELSE
      RETURN QUERY SELECT false, 'reference_reused',
                          greatest(_agent.monthly_spend_limit::numeric - _spent, 0), NULL::bigint;
    END IF;
    RETURN;
  END IF;

  -- The hard ceiling. Nothing authorises exceeding it, not even an approval.
  IF _spent + _amount > _agent.monthly_spend_limit::numeric THEN
    RETURN QUERY SELECT false, 'over_monthly_limit',
                        greatest(_agent.monthly_spend_limit::numeric - _spent, 0), NULL::bigint;
    RETURN;
  END IF;

  -- NULL means no gate; 0 means always ask. See the semantics fix above.
  IF _agent.approval_above IS NOT NULL AND _amount > _agent.approval_above::numeric THEN
    IF _approval_reference IS NULL THEN
      RETURN QUERY SELECT false, 'owner_approval_required',
                          greatest(_agent.monthly_spend_limit::numeric - _spent, 0), NULL::bigint;
      RETURN;
    END IF;

    SELECT * INTO _approval FROM public.approval_requests
     WHERE reference = _approval_reference AND agent_id = _agent.id
     FOR NO KEY UPDATE;

    IF NOT FOUND
       OR _approval.status <> 'approved'
       OR _approval.consumed_at IS NOT NULL
       OR _approval.expires_at <= now()
       OR _approval.amount_usd < _amount THEN
      RETURN QUERY SELECT false, 'approval_invalid',
                          greatest(_agent.monthly_spend_limit::numeric - _spent, 0), NULL::bigint;
      RETURN;
    END IF;

    UPDATE public.approval_requests SET consumed_at = now() WHERE id = _approval.id;
  END IF;

  BEGIN
    INSERT INTO public.agent_usage (agent_id, kind, amount_usd, detail, reference, approval_id)
    VALUES (_agent.id, 'spend', _amount, left(coalesce(_detail, ''), 300), _reference, _approval.id)
    RETURNING id INTO _usage_id;
  EXCEPTION
    -- Unreachable while the row lock holds and reserve_spend is the only writer,
    -- but the contract is that this function returns decisions, so a surprise
    -- collision becomes a refusal instead of a 500.
    WHEN unique_violation THEN
      RETURN QUERY SELECT false, 'reference_reused',
                          greatest(_agent.monthly_spend_limit::numeric - _spent, 0), NULL::bigint;
      RETURN;
  END;

  INSERT INTO public.agent_events (agent_id, kind, detail)
  VALUES (_agent.id, 'spend',
          'Spent $' || to_char(_amount, 'FM999999990.00') ||
          case when coalesce(_detail, '') = '' then '' else ' — ' || left(_detail, 200) end);

  RETURN QUERY SELECT true, 'recorded',
                      greatest(_agent.monthly_spend_limit::numeric - (_spent + _amount), 0), _usage_id;

EXCEPTION
  -- A serialization failure or deadlock means the outcome is unknown, and the one
  -- thing the caller must not conclude is that it may pay. Refuse explicitly so the
  -- agent gets our "do not proceed" guidance rather than an opaque throw.
  WHEN serialization_failure OR deadlock_detected THEN
    RETURN QUERY SELECT false, 'contention_retry', 0::numeric, NULL::bigint;
END $function$;

revoke execute on function public.reserve_spend(text, numeric, text, text, text) from public;
revoke execute on function public.reserve_spend(text, numeric, text, text, text) from anon;
revoke execute on function public.reserve_spend(text, numeric, text, text, text) from authenticated;
grant execute on function public.reserve_spend(text, numeric, text, text, text) to service_role;

comment on function public.reserve_spend(text, numeric, text, text, text) is
  'Atomically checks the monthly cap and records a spend. Per-agent mutex via FOR NO KEY UPDATE. Idempotency is bound to (reference, amount): a replay with a different amount is refused as reference_reused. Returns decisions; does not raise for ordinary refusals.';

-- ------------------------------------------------- performance, under the lock
-- The month aggregate scans every row for the agent while holding the mutex, so
-- per-agent throughput degrades as the month fills. Make it index-only.
create index if not exists agent_usage_agent_created_amount_idx
  on public.agent_usage (agent_id, created_at) include (kind, amount_usd);
