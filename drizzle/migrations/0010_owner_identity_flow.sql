create table if not exists public.owner_identity_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  issuer text not null,
  provider_reference text not null default '',
  state text not null default 'created',
  last_event_id text not null default '',
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  completed_at timestamptz,
  constraint owner_identity_sessions_issuer_check check (issuer in ('didit')),
  constraint owner_identity_sessions_state_check check (state in ('created', 'in_progress', 'approved', 'declined', 'failed', 'expired')),
  constraint owner_identity_sessions_reference_len check (length(provider_reference) <= 200),
  constraint owner_identity_sessions_event_len check (length(last_event_id) <= 100),
  constraint owner_identity_sessions_completion_check check ((state in ('approved', 'declined', 'failed', 'expired')) = (completed_at is not null))
);

create index if not exists owner_identity_sessions_owner_idx on public.owner_identity_sessions (owner_id, created_at desc);
create unique index if not exists owner_identity_sessions_provider_reference_key on public.owner_identity_sessions (issuer, provider_reference) where provider_reference <> '';
create unique index if not exists owner_identity_sessions_event_key on public.owner_identity_sessions (last_event_id) where last_event_id <> '';

alter table public.owner_identity_sessions enable row level security;
revoke all on public.owner_identity_sessions from anon, authenticated;
grant select on public.owner_identity_sessions to authenticated;

drop policy if exists "owner reads identity sessions" on public.owner_identity_sessions;
create policy "owner reads identity sessions" on public.owner_identity_sessions for select to authenticated using (owner_id = auth.uid());

comment on table public.owner_identity_sessions is 'Opaque provider-session binding for one owner identity check. No PII or provider payloads. Owners read their own state; only security-definer functions write.';

create table if not exists public.owner_identity_events (
  event_id text primary key,
  session_id uuid not null references public.owner_identity_sessions(id) on delete cascade,
  occurred_at timestamptz not null,
  outcome text not null,
  processed_at timestamptz not null default now(),
  constraint owner_identity_events_id_len check (length(event_id) between 1 and 100),
  constraint owner_identity_events_outcome_check check (outcome in ('pending', 'resubmitted', 'approved', 'declined', 'expired'))
);

alter table public.owner_identity_events enable row level security;
revoke all on public.owner_identity_events from anon, authenticated;
comment on table public.owner_identity_events is 'Provider event idempotency ledger. Structural IDs and outcomes only; no PII or webhook payloads; no client access.';

create unique index if not exists owner_attestations_provider_reference_key on public.owner_attestations (issuer, reference) where reference <> '';

revoke execute on function public.record_owner_attestation(uuid, text, text, text, text, text, int) from service_role;

create or replace function public.begin_owner_identity_session(_issuer text)
  returns table(attempt_id uuid, expires_at timestamptz, can_start boolean)
  language plpgsql volatile security definer set search_path to 'public', 'extensions'
as $function$
DECLARE
  _owner_id uuid := auth.uid();
  _attempt public.owner_identity_sessions;
BEGIN
  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = 'insufficient_privilege';
  END IF;
  IF _issuer <> 'didit' THEN
    RAISE EXCEPTION 'unsupported_identity_issuer' USING errcode = 'invalid_parameter_value';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_owner_id::text || ':' || _issuer, 0));
  UPDATE public.owner_identity_sessions s
     SET state = 'expired', completed_at = now()
   WHERE s.owner_id = _owner_id AND s.issuer = _issuer
     AND s.state IN ('created', 'in_progress') AND s.expires_at <= now();
  SELECT * INTO _attempt FROM public.owner_identity_sessions s
   WHERE s.owner_id = _owner_id AND s.issuer = _issuer
     AND s.state IN ('created', 'in_progress') AND s.expires_at > now()
   ORDER BY s.created_at DESC LIMIT 1;
  IF _attempt.id IS NOT NULL THEN
    RETURN QUERY SELECT _attempt.id, _attempt.expires_at, false;
    RETURN;
  END IF;
  INSERT INTO public.owner_identity_sessions (owner_id, issuer) VALUES (_owner_id, _issuer) RETURNING * INTO _attempt;
  RETURN QUERY SELECT _attempt.id, _attempt.expires_at, true;
END
$function$;

revoke execute on function public.begin_owner_identity_session(text) from public;
revoke execute on function public.begin_owner_identity_session(text) from anon;
grant execute on function public.begin_owner_identity_session(text) to authenticated;

create or replace function public.bind_owner_identity_session(_attempt_id uuid, _provider_reference text)
  returns boolean
  language plpgsql volatile security definer set search_path to 'public'
as $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = 'insufficient_privilege';
  END IF;
  IF _provider_reference IS NULL OR length(_provider_reference) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'invalid_provider_reference' USING errcode = 'invalid_parameter_value';
  END IF;
  UPDATE public.owner_identity_sessions s
     SET provider_reference = _provider_reference,
         state = 'in_progress',
         expires_at = case when s.state = 'created' then now() + interval '24 hours' else s.expires_at end
   WHERE s.id = _attempt_id
     AND s.owner_id = auth.uid()
     AND s.expires_at > now()
     AND ((s.state = 'created' AND s.provider_reference = '')
       OR (s.state = 'in_progress' AND s.provider_reference = _provider_reference));
  RETURN FOUND;
END
$function$;

revoke execute on function public.bind_owner_identity_session(uuid, text) from public;
revoke execute on function public.bind_owner_identity_session(uuid, text) from anon;
grant execute on function public.bind_owner_identity_session(uuid, text) to authenticated;

create or replace function public.abandon_owner_identity_session(_attempt_id uuid)
  returns boolean
  language plpgsql volatile security definer set search_path to 'public'
as $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = 'insufficient_privilege';
  END IF;
  UPDATE public.owner_identity_sessions s
     SET state = 'failed', completed_at = now()
   WHERE s.id = _attempt_id AND s.owner_id = auth.uid() AND s.state IN ('created', 'in_progress');
  RETURN FOUND;
END
$function$;

revoke execute on function public.abandon_owner_identity_session(uuid) from public;
revoke execute on function public.abandon_owner_identity_session(uuid) from anon;
grant execute on function public.abandon_owner_identity_session(uuid) to authenticated;

create or replace function public.owner_identity_status()
  returns table(state text, issuer text, method text, assurance text, verified_at timestamptz, attestation_expires_at timestamptz, updated_at timestamptz)
  language sql stable security definer set search_path to 'public'
as $function$
  with me as (select auth.uid() as owner_id),
  att as (
    select a.issuer, a.method, a.assurance, a.verified_at, a.expires_at
      from me cross join lateral public.current_owner_attestation(me.owner_id) a
  ),
  latest as (
    select s.state, s.issuer, s.expires_at, coalesce(s.completed_at, s.created_at) as updated_at
      from public.owner_identity_sessions s, me
     where s.owner_id = me.owner_id
     order by s.created_at desc limit 1
  )
  select
    case
      when att.assurance is not null then 'verified'
      when latest.state = 'created' and latest.expires_at > now() then 'starting'
      when latest.state = 'in_progress' and latest.expires_at > now() then 'in_progress'
      when latest.state in ('created', 'in_progress') and latest.expires_at <= now() then 'expired'
      when latest.state in ('declined', 'failed', 'expired') then latest.state
      else 'not_started'
    end,
    coalesce(att.issuer, latest.issuer), att.method, att.assurance, att.verified_at, att.expires_at, latest.updated_at
  from me left join att on true left join latest on true
  where me.owner_id is not null
$function$;

revoke execute on function public.owner_identity_status() from public;
revoke execute on function public.owner_identity_status() from anon;
grant execute on function public.owner_identity_status() to authenticated;

create or replace function public.finalize_owner_identity_session(
  _attempt_id uuid, _issuer text, _provider_reference text, _event_id text, _occurred_at timestamptz,
  _outcome text, _method text, _assurance text, _subject_country text default ''
)
  returns table(state text, attestation_id bigint)
  language plpgsql volatile security definer set search_path to 'public'
as $function$
DECLARE
  _session public.owner_identity_sessions;
  _existing public.owner_attestations;
  _attestation_id bigint;
  _expected_assurance text;
BEGIN
  IF _attempt_id IS NULL
     OR _provider_reference IS NULL OR length(_provider_reference) NOT BETWEEN 1 AND 200
     OR _event_id IS NULL OR length(_event_id) NOT BETWEEN 1 AND 100
     OR _occurred_at IS NULL
     OR _outcome NOT IN ('pending', 'resubmitted', 'approved', 'declined', 'expired') THEN
    RAISE EXCEPTION 'invalid_identity_verdict' USING errcode = 'invalid_parameter_value';
  END IF;

  SELECT * INTO _session FROM public.owner_identity_sessions s WHERE s.id = _attempt_id FOR UPDATE;

  IF _session.id IS NULL OR _session.issuer <> _issuer
     OR _session.provider_reference = '' OR _session.provider_reference <> _provider_reference THEN
    RAISE EXCEPTION 'identity_session_mismatch' USING errcode = 'invalid_parameter_value';
  END IF;

  SELECT * INTO _existing FROM public.owner_attestations a WHERE a.issuer = _issuer AND a.reference = _provider_reference;
  _attestation_id := _existing.id;

  INSERT INTO public.owner_identity_events (event_id, session_id, occurred_at, outcome)
  VALUES (_event_id, _session.id, _occurred_at, _outcome)
  ON CONFLICT (event_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN QUERY SELECT _session.state, _attestation_id;
    RETURN;
  END IF;

  IF _session.last_event_at IS NOT NULL AND _occurred_at < _session.last_event_at THEN
    RETURN QUERY SELECT _session.state, _attestation_id;
    RETURN;
  END IF;

  IF _occurred_at > _session.expires_at AND _outcome <> 'expired' THEN
    UPDATE public.owner_identity_sessions s
       SET state = 'expired', completed_at = now(), last_event_id = _event_id, last_event_at = _occurred_at
     WHERE s.id = _session.id;
    RETURN QUERY SELECT 'expired'::text, _attestation_id;
    RETURN;
  END IF;

  IF _session.state = 'approved' AND _outcome <> 'expired' THEN
    RETURN QUERY SELECT _session.state, _attestation_id;
    RETURN;
  END IF;
  IF _session.state IN ('failed', 'expired') THEN
    RETURN QUERY SELECT _session.state, _attestation_id;
    RETURN;
  END IF;

  IF _outcome = 'expired' THEN
    UPDATE public.owner_attestations a SET revoked_at = coalesce(a.revoked_at, now())
     WHERE a.issuer = _issuer AND a.reference = _provider_reference;
    UPDATE public.owner_identity_sessions s
       SET state = 'expired', completed_at = now(), last_event_id = _event_id, last_event_at = _occurred_at
     WHERE s.id = _session.id;
    UPDATE public.profiles p
       SET identity_verified = exists (
         select 1 from public.owner_attestations a
          where a.owner_id = _session.owner_id and a.revoked_at is null and a.expires_at > now() and a.assurance <> 'none')
     WHERE p.id = _session.owner_id;
    RETURN QUERY SELECT 'expired'::text, _attestation_id;
    RETURN;
  END IF;

  IF _outcome = 'resubmitted' THEN
    UPDATE public.owner_identity_sessions s
       SET state = 'in_progress', completed_at = null, last_event_id = _event_id, last_event_at = _occurred_at
     WHERE s.id = _session.id AND s.state IN ('declined', 'created', 'in_progress');
    RETURN QUERY SELECT 'in_progress'::text, _attestation_id;
    RETURN;
  END IF;

  IF _session.state = 'declined' THEN
    RETURN QUERY SELECT _session.state, _attestation_id;
    RETURN;
  END IF;

  IF _outcome = 'pending' THEN
    UPDATE public.owner_identity_sessions s
       SET state = 'in_progress', last_event_id = _event_id, last_event_at = _occurred_at
     WHERE s.id = _session.id;
    RETURN QUERY SELECT 'in_progress'::text, _attestation_id;
    RETURN;
  END IF;

  IF _outcome = 'declined' THEN
    UPDATE public.owner_identity_sessions s
       SET state = 'declined', completed_at = now(), last_event_id = _event_id, last_event_at = _occurred_at
     WHERE s.id = _session.id;
    RETURN QUERY SELECT 'declined'::text, _attestation_id;
    RETURN;
  END IF;

  IF _occurred_at + interval '1 year' <= now() THEN
    UPDATE public.owner_identity_sessions s
       SET state = 'expired', completed_at = now(), last_event_id = _event_id, last_event_at = _occurred_at
     WHERE s.id = _session.id;
    RETURN QUERY SELECT 'expired'::text, _attestation_id;
    RETURN;
  END IF;

  _expected_assurance := case _method
    when 'government_id' then 'substantial'
    when 'government_id_and_liveness' then 'high'
    when 'business_registry' then 'substantial'
    when 'business_registry_and_ubo' then 'high'
    else null
  end;

  IF _expected_assurance IS NULL OR _assurance <> _expected_assurance THEN
    RAISE EXCEPTION 'assurance_method_mismatch' USING errcode = 'invalid_parameter_value';
  END IF;
  IF coalesce(_subject_country, '') <> '' AND upper(_subject_country) !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_subject_country' USING errcode = 'invalid_parameter_value';
  END IF;

  IF _existing.id IS NOT NULL AND _existing.owner_id <> _session.owner_id THEN
    RAISE EXCEPTION 'provider_reference_owner_mismatch' USING errcode = 'unique_violation';
  END IF;

  IF _existing.id IS NULL THEN
    INSERT INTO public.owner_attestations (owner_id, issuer, method, assurance, reference, subject_country, verified_at, expires_at)
    VALUES (_session.owner_id, _issuer, _method, _assurance, _provider_reference, upper(coalesce(_subject_country, '')), _occurred_at, _occurred_at + interval '1 year')
    RETURNING id INTO _attestation_id;
  END IF;

  UPDATE public.owner_identity_sessions s
     SET state = 'approved', completed_at = now(), last_event_id = _event_id, last_event_at = _occurred_at
   WHERE s.id = _session.id;

  UPDATE public.profiles p SET identity_verified = true WHERE p.id = _session.owner_id;

  RETURN QUERY SELECT 'approved'::text, _attestation_id;
END
$function$;

revoke execute on function public.finalize_owner_identity_session(uuid, text, text, text, timestamptz, text, text, text, text) from public;
revoke execute on function public.finalize_owner_identity_session(uuid, text, text, text, timestamptz, text, text, text, text) from anon;
revoke execute on function public.finalize_owner_identity_session(uuid, text, text, text, timestamptz, text, text, text, text) from authenticated;
grant execute on function public.finalize_owner_identity_session(uuid, text, text, text, timestamptz, text, text, text, text) to service_role;

comment on function public.finalize_owner_identity_session(uuid, text, text, text, timestamptz, text, text, text, text) is 'Idempotently applies ordered provider lifecycle events to an opaque owner attempt. service_role only; application code verifies the provider HMAC and evidence first.';