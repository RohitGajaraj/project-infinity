-- Fixes two defects in 20260929191000_signed_actions.sql, both found by Lovable
-- when it applied that migration. The second is a live vulnerability.
--
-- Safe to apply more than once.

-- ============================================================ 1. ambiguity
-- `issue_agent_challenge` declares a RETURNS TABLE column named expires_at, and
-- the cleanup DELETE referenced a column of the same name. Postgres cannot tell
-- which one is meant and rejects the call, so the function fails every time it
-- runs. Qualify the table reference.

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

  -- Table-qualified: bare `expires_at` collides with the OUT parameter above.
  DELETE FROM public.agent_challenges
   WHERE public.agent_challenges.expires_at < now() - interval '1 day';

  RETURN QUERY SELECT _nonce, (now() + interval '2 minutes')::timestamptz;
END $function$;

-- ================================================= 2. the vulnerability
-- As shipped, `record_signed_action` was executable by anon, and the only check
-- on the signature was that it is non-empty. The Ed25519 verification happens in
-- application code — so an anonymous caller could skip our server entirely, ask
-- for a challenge over the REST API, and record an entry attributed to the agent
-- with an invented signature.
--
-- That is worse than a missing feature. The chained log is the one artefact that
-- has to be trustworthy, and this let anyone write forged authorship into it.
--
-- Root cause was a reasoning error on our side: "the server verifies before
-- calling" is only true if the server is the *only* possible caller. It was not.
--
-- Fix: writing to the log becomes a privileged operation. Only service_role may
-- execute it, and the server uses the admin client for this one call. Issuing a
-- challenge stays open to anon because a challenge grants nothing on its own.

revoke execute on function public.record_signed_action(text, text, text, text, text) from public;
revoke execute on function public.record_signed_action(text, text, text, text, text) from anon;
revoke execute on function public.record_signed_action(text, text, text, text, text) from authenticated;
grant  execute on function public.record_signed_action(text, text, text, text, text) to service_role;

-- Defence in depth: even a privileged caller must pass something shaped like an
-- Ed25519 signature. A 64-byte signature is 86 base64url characters, and
-- base64url never contains '+', '/' or '='. This does not verify anything — only
-- application code can do that — it just makes a lazy placeholder impossible.
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
