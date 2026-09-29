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

  DELETE FROM public.agent_challenges
   WHERE public.agent_challenges.expires_at < now() - interval '1 day';

  RETURN QUERY SELECT _nonce, (now() + interval '2 minutes')::timestamptz;
END $function$;

revoke execute on function public.record_signed_action(text, text, text, text, text) from public;
revoke execute on function public.record_signed_action(text, text, text, text, text) from anon;
revoke execute on function public.record_signed_action(text, text, text, text, text) from authenticated;
grant  execute on function public.record_signed_action(text, text, text, text, text) to service_role;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agent_events_signature_shape_check') then
    alter table public.agent_events
      add constraint agent_events_signature_shape_check
      check (
        signer <> 'agent'
        or (length(signature) between 80 and 96 and signature ~ '^[A-Za-z0-9_-]+$')
      );
  end if;
end $$;

comment on function public.record_signed_action(text, text, text, text, text) is
  'Appends an agent-signed entry. service_role ONLY: the Ed25519 check happens in application code, so exposing this to anon would let anyone forge authorship in the log.';