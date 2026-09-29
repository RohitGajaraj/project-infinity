create index if not exists agent_challenges_expires_idx
  on public.agent_challenges (expires_at);

alter table public.agent_challenges
  drop constraint if exists agent_challenges_nonce_len;
alter table public.agent_challenges
  add constraint agent_challenges_nonce_len check (length(nonce) between 16 and 1024);

revoke execute on function public.issue_agent_challenge(text, text) from public;
revoke execute on function public.issue_agent_challenge(text, text) from anon;
revoke execute on function public.issue_agent_challenge(text, text) from authenticated;
grant execute on function public.issue_agent_challenge(text, text) to service_role;

create or replace function public.record_signed_action(
  _public_id text,
  _nonce text,
  _kind text,
  _detail text,
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
  _hash text;
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

  DELETE FROM public.agent_challenges c
   WHERE c.nonce IN (
     SELECT old.nonce
       FROM public.agent_challenges old
      WHERE old.consumed_at IS NOT NULL
        AND old.expires_at < now() - interval '10 minutes'
      ORDER BY old.expires_at
      LIMIT 1000
   );

  INSERT INTO public.agent_challenges (
    nonce, agent_id, purpose, created_at, expires_at, consumed_at
  )
  VALUES (
    _nonce, _agent_id, 'mcp_authorization', now(), now(), now()
  )
  ON CONFLICT (nonce) DO NOTHING;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge_invalid_or_replayed' USING errcode = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.agent_events (agent_id, kind, detail, signer, signature, nonce)
  VALUES (_agent_id, _kind, coalesce(_detail, ''), 'agent', _signature, _nonce)
  RETURNING id, agent_events.hash INTO _event_id, _hash;

  RETURN QUERY SELECT _event_id, _hash;
END
$function$;

revoke execute on function public.record_signed_action(text, text, text, text, text) from public;
revoke execute on function public.record_signed_action(text, text, text, text, text) from anon;
revoke execute on function public.record_signed_action(text, text, text, text, text) from authenticated;
grant execute on function public.record_signed_action(text, text, text, text, text) to service_role;

comment on function public.issue_agent_challenge(text, text) is
  'Legacy server-only issuer. Public MCP challenge issuance is stateless; do not grant this function to anon.';
comment on function public.record_signed_action(text, text, text, text, text) is
  'After application Ed25519 and freshness checks, atomically records the nonce as consumed and appends the event. service_role only.';