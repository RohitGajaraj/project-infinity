-- Owner identity verification (closes DIRECTION.md §9 G4).
--
-- Until now `profiles.identity_verified` was a boolean with no way to set it, so
-- every credential read "identity not yet checked" and the accountable-owner
-- claim — the core of the whole product — was unbacked.
--
-- Three design decisions, each with a reason:
--
-- 1. AN ATTESTATION, NOT A BOOLEAN. "verified" alone is unfalsifiable: verified by
--    whom, how, and when? A verifier deciding whether to accept a $5,000 purchase
--    needs to know it was a government ID with liveness checked yesterday, not a
--    self-declaration from 2024. So we record issuer, method, assurance level and
--    timestamp, and the credential carries all four.
--
-- 2. NO PII, EVER. We store the provider's verdict and an opaque reference, never
--    a name, date of birth, document number or image. Provider webhooks include
--    extracted PII by default, so the application strips it at the boundary — see
--    src/lib/identity.ts. This keeps the "nothing sensitive in the database" rule
--    intact instead of quietly creating a new category of data to protect.
--
-- 3. OPERATOR-ASSERTED, AND LABELLED AS SUCH. Unlike the signature on a
--    credential, nobody can check this offline — it rests on our word plus the
--    provider's. That is the same distinction we already enforce between signing
--    and hash-chaining, so the column name and the credential field both say so.
--
-- Safe to apply more than once.

-- ============================================================ attestations
create table if not exists public.owner_attestations (
  id           bigint      generated always as identity primary key,
  owner_id     uuid        not null references auth.users(id) on delete cascade,

  -- Who asserts it. 'self_declared' is the honest label for an unchecked owner.
  issuer       text        not null,
  -- What was actually checked.
  method       text        not null,
  -- How strong the check is, eIDAS-style, so a verifier can set its own bar.
  assurance    text        not null,

  -- Opaque provider reference for audit and dispute. Never PII.
  reference    text        not null default '',
  -- Country of the verified subject, ISO-3166-1 alpha-2. Coarse by design:
  -- useful for a verifier, not identifying on its own.
  subject_country text     not null default '',

  verified_at  timestamptz not null default now(),
  -- Attestations go stale. A two-year-old liveness check is not current.
  expires_at   timestamptz not null default (now() + interval '1 year'),
  revoked_at   timestamptz,

  created_at   timestamptz not null default now(),

  constraint owner_attestations_issuer_check
    check (issuer in ('self_declared', 'didit', 'persona', 'sumsub', 'manual_review')),
  constraint owner_attestations_method_check
    check (method in ('none', 'email_only', 'government_id', 'government_id_and_liveness', 'business_registry', 'business_registry_and_ubo')),
  constraint owner_attestations_assurance_check
    check (assurance in ('none', 'basic', 'substantial', 'high')),
  constraint owner_attestations_reference_len check (length(reference) <= 200),
  constraint owner_attestations_country_len check (length(subject_country) <= 2),
  -- 'none' assurance must not claim a real method, and vice versa.
  constraint owner_attestations_coherent
    check ((assurance = 'none') = (method in ('none', 'email_only')))
);

create index if not exists owner_attestations_owner_idx
  on public.owner_attestations (owner_id, verified_at desc);

alter table public.owner_attestations enable row level security;

revoke all on public.owner_attestations from anon, authenticated;
-- Owners may read their own attestations so the console can show their status.
grant select on public.owner_attestations to authenticated;

drop policy if exists "own attestations read" on public.owner_attestations;
create policy "own attestations read"
  on public.owner_attestations for select to authenticated
  using (auth.uid() = owner_id);

-- No insert/update/delete policy and no grant: written only by the
-- security-definer function below, called by the server after it has verified a
-- provider webhook signature. Same lesson as record_signed_action — if the check
-- lives in application code, the function must not be callable by anon.
comment on table public.owner_attestations is
  'Operator-asserted identity attestations for agent owners. Verdict and opaque reference only, never PII. Not independently verifiable by a third party.';

-- ============================================ current attestation, resolved
-- One place that decides "what is this owner''s standing right now", so the
-- credential, the console and the public verify endpoint cannot disagree.
create or replace function public.current_owner_attestation(_owner_id uuid)
  returns table(issuer text, method text, assurance text, verified_at timestamptz, expires_at timestamptz)
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  select a.issuer, a.method, a.assurance, a.verified_at, a.expires_at
    from public.owner_attestations a
   where a.owner_id = _owner_id
     and a.revoked_at is null
     and a.expires_at > now()
     and a.assurance <> 'none'
   -- Strongest first, then most recent: an owner may hold several.
   order by case a.assurance when 'high' then 3 when 'substantial' then 2 when 'basic' then 1 else 0 end desc,
            a.verified_at desc
   limit 1
$function$;

revoke execute on function public.current_owner_attestation(uuid) from public;
grant execute on function public.current_owner_attestation(uuid) to anon, authenticated, service_role;

-- ================================================ record a new attestation
create or replace function public.record_owner_attestation(
  _owner_id        uuid,
  _issuer          text,
  _method          text,
  _assurance       text,
  _reference       text,
  _subject_country text,
  _valid_months    int default 12
)
  returns bigint
  language plpgsql
  volatile
  security definer
  set search_path to 'public'
as $function$
DECLARE _id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _owner_id) THEN
    RAISE EXCEPTION 'unknown_owner' USING errcode = 'no_data_found';
  END IF;

  INSERT INTO public.owner_attestations
    (owner_id, issuer, method, assurance, reference, subject_country, expires_at)
  VALUES
    (_owner_id, _issuer, _method, _assurance, COALESCE(_reference, ''),
     upper(COALESCE(_subject_country, '')), now() + make_interval(months => GREATEST(1, _valid_months)))
  RETURNING id INTO _id;

  -- Keep the legacy boolean in step so nothing reading it goes stale. It is a
  -- derived convenience now, not the source of truth.
  UPDATE public.profiles p
     SET identity_verified = (_assurance <> 'none')
   WHERE p.id = _owner_id;

  RETURN _id;
END $function$;

revoke execute on function public.record_owner_attestation(uuid, text, text, text, text, text, int) from public;
revoke execute on function public.record_owner_attestation(uuid, text, text, text, text, text, int) from anon;
revoke execute on function public.record_owner_attestation(uuid, text, text, text, text, text, int) from authenticated;
-- service_role only: the server calls this after verifying a provider webhook
-- signature. Exposing it to anon would let anyone mark themselves verified.
grant execute on function public.record_owner_attestation(uuid, text, text, text, text, text, int) to service_role;

-- ============================================ expose it to verification
-- Extends verify_agent with the owner's attestation. Column order is preserved
-- and new columns are appended, so existing callers keep working.
create or replace function public.verify_agent(_public_id text)
  returns table(
    public_id text, name text, source text, status text,
    owner_name text, owner_verified boolean,
    permissions text[], monthly_spend_limit integer, approval_above integer,
    public_key text, created_at timestamptz, expires_at timestamptz, last_hash text,
    owner_attestation_issuer text, owner_attestation_method text,
    owner_attestation_assurance text, owner_attestation_verified_at timestamptz
  )
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  SELECT a.public_id, a.name, a.source, a.status,
         p.display_name,
         -- Derived from the live attestation rather than the stored boolean, so a
         -- lapsed attestation stops reading as verified without a backfill.
         (att.assurance IS NOT NULL),
         a.permissions, a.monthly_spend_limit, a.approval_above,
         a.public_key, a.created_at, a.expires_at,
         (SELECT e.hash FROM public.agent_events e WHERE e.agent_id = a.id ORDER BY e.id DESC LIMIT 1),
         att.issuer, att.method, att.assurance, att.verified_at
    FROM public.agents a
    LEFT JOIN public.profiles p ON p.id = a.owner_id
    LEFT JOIN LATERAL public.current_owner_attestation(a.owner_id) att ON true
   WHERE a.public_id = _public_id
$function$;

revoke execute on function public.verify_agent(text) from public;
grant execute on function public.verify_agent(text) to anon, authenticated, service_role;
