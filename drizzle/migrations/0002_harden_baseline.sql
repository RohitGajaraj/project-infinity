-- Hardening found by auditing db/baseline.sql, which became readable only after
-- Lovable exported it. Three issues, none of them cosmetic. No behaviour change
-- for the app; all three narrow what is possible.
--
-- Safe to apply more than once.

-- =============================================================== 1. GRANTs
-- Found: anon holds SELECT/INSERT/UPDATE/DELETE on all three tables. RLS blocks
-- every such request today because no policy targets anon, so nothing leaks —
-- verified live. But that makes RLS the *only* thing standing between an
-- anonymous caller and the data, and one mistaken policy becomes a breach
-- instead of a near miss. Defence in depth: remove the privilege as well.
--
-- Nothing in the app needs it. Public verification goes through the
-- security-definer verify_agent function, which has its own explicit grant.

revoke all on public.profiles     from anon;
revoke all on public.agents       from anon;
revoke all on public.agent_events from anon;
revoke all on sequence public.agent_events_id_seq from anon;

-- `authenticated` keeps only what the console actually uses, and RLS still
-- scopes every row to the signed-in owner.
revoke all on public.profiles     from authenticated;
revoke all on public.agents       from authenticated;
revoke all on public.agent_events from authenticated;
revoke all on sequence public.agent_events_id_seq from authenticated;

grant select, insert, update          on public.profiles     to authenticated;
grant select, insert, update, delete  on public.agents       to authenticated;
-- Read-only: agent_events is written exclusively by security-definer triggers,
-- so no role needs INSERT on it. An append-only log that its own subject can
-- write is not an audit log.
grant select                          on public.agent_events to authenticated;

-- =============================================================== 2. Agent IDs
-- Found: gen_agent_public_id() used random(), a seeded PRNG. Agent IDs are
-- public identifiers, so secrecy is not the issue — predictability is. Anyone
-- who can guess IDs can walk the public verify endpoint and harvest owner names,
-- permissions and monthly spend limits in bulk. That is a privacy problem
-- created by the ID generator, not by the endpoint.
--
-- gen_random_bytes is cryptographically secure. The alphabet is 32 characters
-- and a byte has 256 values, so `byte % 32` is exactly unbiased (256 = 8 x 32).
-- Existing IDs keep working; this only changes what new ones look like.

create or replace function public.gen_agent_public_id()
  returns text
  language plpgsql
  volatile
  set search_path to 'public', 'extensions'
as $function$
DECLARE
  -- Crockford-style: no I, O, 0, 1 so an ID can be read aloud over the phone,
  -- which phase 3 will need.
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw   bytea := extensions.gen_random_bytes(12);
  s     text  := '';
  i     int;
BEGIN
  FOR i IN 1..12 LOOP
    s := s || substr(chars, 1 + (get_byte(raw, i - 1) % 32), 1);
    IF i IN (4, 8) THEN s := s || '-'; END IF;
  END LOOP;
  RETURN 'inf_' || s;
END $function$;

-- =============================================================== 3. Hash chain
-- Found: the chain hashed its fields joined with '|'. `detail` is free text, so
-- two different event sets can serialise to the same string — classic delimiter
-- injection. It is only latent today because triggers write every row, but
-- proof-of-possession will start writing agent-supplied text into `detail`, and
-- a canonicalisation flaw is far cheaper to fix before that than after.
--
-- Fix: length-prefix every field, so no field's content can be mistaken for a
-- delimiter or for part of its neighbour.
--
-- Old rows keep the hashes they were written with. That is fine: verification
-- checks that each row's prev_hash equals the previous row's hash, and those
-- links stay intact across the format change.

create or replace function public.chain_event()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public', 'extensions'
as $function$
DECLARE
  last    text;
  payload text;
BEGIN
  SELECT hash INTO last
    FROM public.agent_events
   WHERE agent_id = NEW.agent_id
   ORDER BY id DESC
   LIMIT 1;

  NEW.prev_hash := COALESCE(last, 'genesis');

  -- v2: length-prefixed, unambiguous. The version tag is inside the hash so a
  -- verifier can tell the two formats apart instead of guessing.
  payload :=
    'v2'                                             || ':' ||
    length(NEW.prev_hash)            || ':' || NEW.prev_hash            || ':' ||
    length(NEW.agent_id::text)       || ':' || NEW.agent_id::text       || ':' ||
    length(NEW.kind)                 || ':' || NEW.kind                 || ':' ||
    length(COALESCE(NEW.detail, '')) || ':' || COALESCE(NEW.detail, '') || ':' ||
    length(NEW.created_at::text)     || ':' || NEW.created_at::text;

  NEW.hash := encode(extensions.digest(payload, 'sha256'), 'hex');
  RETURN NEW;
END $function$;

comment on function public.chain_event() is
  'Appends a length-prefixed (v2) SHA-256 chain link to agent_events. Tamper-evident against edits, not against the database operator — authorship requires a signature, see agent_events.signature.';
