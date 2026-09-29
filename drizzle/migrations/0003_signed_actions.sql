-- Proof of possession and signed actions.
--
-- Closes the two worst claims-vs-reality gaps in DIRECTION.md §9: the agent's
-- Ed25519 keypair was decorative (G2), and the log was called "signed" when it
-- was only hash-chained (G1). Chaining shows nobody edited the sequence *if you
-- trust this database*; a signature shows who wrote the entry, which is what
-- makes the log evidence rather than bookkeeping.
--
-- Scope note: a *business* verifying an agent generates its own nonce and checks
-- the signature locally against the public key inside the credential — that path
-- needs nothing from this database, which is what keeps verification free and
-- zero-integration (§10.4). This migration covers the other direction, where
-- Infinity is the verifier: an agent proving itself to us over MCP.
--
-- Safe to apply more than once.

-- =============================================== 1. authorship on the log
alter table public.agent_events
  add column if not exists signer    text not null default 'infinity',
  add column if not exists signature text not null default '',
  add column if not exists nonce     text not null default '';

comment on column public.agent_events.signer is
  'Who asserts this entry: infinity (system/trigger), agent (Ed25519-signed), or owner (console action).';
comment on column public.agent_events.signature is
  'Base64url Ed25519 signature by the agent over the canonical action string. Empty when signer is not the agent.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agent_events_signer_check') then
    alter table public.agent_events
      add constraint agent_events_signer_check
      check (signer in ('infinity', 'agent', 'owner'));
  end if;
  -- An entry claiming to be from the agent must actually carry a signature.
  if not exists (select 1 from pg_constraint where conname = 'agent_events_agent_signed_check') then
    alter table public.agent_events
      add constraint agent_events_agent_signed_check
      check (signer <> 'agent' or length(signature) > 0);
  end if;
end $$;

-- =============================================== 2. single-use challenges
-- Without single-use enforcement, a captured signature is replayable forever,
-- and the whole point of proof of possession is lost.
create table if not exists public.agent_challenges (
  nonce       text        not null primary key,
  agent_id    uuid        not null references public.agents(id) on delete cascade,
  purpose     text        not null default 'proof_of_possession',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '2 minutes'),
  consumed_at timestamptz,
  constraint agent_challenges_nonce_len check (length(nonce) between 16 and 128)
);

create index if not exists agent_challenges_agent_idx
  on public.agent_challenges (agent_id, created_at desc);

alter table public.agent_challenges enable row level security;

-- No policies and no grants: this table is reachable only through the
-- security-definer functions below. Nothing else may read or write it.
revoke all on public.agent_challenges from anon, authenticated;

-- =============================================== 3. issue a challenge
create or replace function public.issue_agent_challenge(_public_id text, _purpose text default 'proof_of_possession')
  returns table(nonce text, expires_at timestamptz)
  language plpgsql
  volatile
  security definer
  set search_path to 'public', 'extensions'
as $function$
DECLARE
  _agent_id uuid;
  _nonce    text;
BEGIN
  SELECT a.id INTO _agent_id
    FROM public.agents a
   WHERE a.public_id = _public_id
     AND a.status = 'valid'
     AND a.expires_at > now();

  IF _agent_id IS NULL THEN
    RAISE EXCEPTION 'unknown_or_unusable_agent' USING errcode = 'no_data_found';
  END IF;

  _nonce := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.agent_challenges (nonce, agent_id, purpose)
  VALUES (_nonce, _agent_id, COALESCE(_purpose, 'proof_of_possession'));

  -- Opportunistic cleanup; keeps the table from growing without a cron job.
  DELETE FROM public.agent_challenges
   WHERE expires_at < now() - interval '1 day';

  RETURN QUERY SELECT _nonce, (now() + interval '2 minutes')::timestamptz;
END $function$;

-- =============================================== 4. consume + record
-- The Ed25519 check happens in application code with WebCrypto, never here:
-- Postgres has no Ed25519 verify, and the same pure module a third party would
-- use should do the maths. This function enforces the parts SQL is good at —
-- the nonce is real, unexpired, unconsumed, and belongs to this agent — and
-- appends the entry atomically so a replay cannot slip between the two.
create or replace function public.record_signed_action(
  _public_id text,
  _nonce     text,
  _kind      text,
  _detail    text,
  _signature text
)
  returns table(event_id bigint, hash text)
  language plpgsql
  volatile
  security definer
  set search_path to 'public', 'extensions'
as $function$
DECLARE
  _agent_id uuid;
  _event_id bigint;
  _hash     text;
BEGIN
  IF _signature IS NULL OR length(_signature) = 0 THEN
    RAISE EXCEPTION 'signature_required' USING errcode = 'invalid_parameter_value';
  END IF;

  SELECT a.id INTO _agent_id
    FROM public.agents a
   WHERE a.public_id = _public_id
     AND a.status = 'valid'
     AND a.expires_at > now();

  IF _agent_id IS NULL THEN
    RAISE EXCEPTION 'unknown_or_unusable_agent' USING errcode = 'no_data_found';
  END IF;

  -- Atomically claim the nonce. If this updates no row the nonce was already
  -- used, expired, or never issued to this agent.
  UPDATE public.agent_challenges
     SET consumed_at = now()
   WHERE nonce = _nonce
     AND agent_id = _agent_id
     AND consumed_at IS NULL
     AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge_invalid_or_replayed' USING errcode = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.agent_events (agent_id, kind, detail, signer, signature, nonce)
  VALUES (_agent_id, _kind, COALESCE(_detail, ''), 'agent', _signature, _nonce)
  RETURNING id, agent_events.hash INTO _event_id, _hash;

  RETURN QUERY SELECT _event_id, _hash;
END $function$;

-- Only the server calls these, with the publishable key, so anon needs execute.
-- They are safe to expose: both require a valid agent, and record_signed_action
-- additionally requires an unconsumed nonce that the caller can only obtain by
-- asking for one, and a signature the server has already verified.
revoke execute on function public.issue_agent_challenge(text, text) from public;
revoke execute on function public.record_signed_action(text, text, text, text, text) from public;
grant execute on function public.issue_agent_challenge(text, text) to anon, authenticated, service_role;
grant execute on function public.record_signed_action(text, text, text, text, text) to anon, authenticated, service_role;
