-- Append-only agent key lifecycle and key-version-bound authorization.
--
-- This is an expansion migration. It backfills key v1 and adds key-aware RPCs,
-- but rotation and recovery remain disabled until the key-aware application is
-- published and live-probed. Existing five-argument record_signed_action and
-- legacy approval/spend functions remain usable during that window.
--
-- Agent ID and mandate version stay stable across a key change. Routine rotation
-- proves continuity with the old key and possession of the new key. Recovery
-- deliberately does not claim continuity and leaves the agent frozen.

-- ====================================================== 1. key validation
create or replace function public.agent_public_key_fingerprint(_public_key text)
  returns text
  language plpgsql
  immutable
  strict
  set search_path to 'public', 'extensions'
as $function$
declare
  _encoded text;
  _raw bytea;
begin
  if _public_key !~ '^ed25519:[A-Za-z0-9+/]{43}=$' then
    raise exception 'invalid_agent_public_key' using errcode = 'invalid_parameter_value';
  end if;

  _encoded := substr(_public_key, 9);
  begin
    _raw := decode(_encoded, 'base64');
  exception when others then
    raise exception 'invalid_agent_public_key' using errcode = 'invalid_parameter_value';
  end;

  if octet_length(_raw) <> 32 or encode(_raw, 'base64') <> _encoded then
    raise exception 'invalid_agent_public_key' using errcode = 'invalid_parameter_value';
  end if;

  return encode(extensions.digest(_raw, 'sha256'), 'hex');
end
$function$;

revoke execute on function public.agent_public_key_fingerprint(text)
  from public, anon, authenticated;

do $function$
declare
  _row record;
begin
  for _row in select id, public_key from public.agents loop
    perform public.agent_public_key_fingerprint(_row.public_key);
  end loop;

  if exists (
    select 1
      from public.agents
     group by public.agent_public_key_fingerprint(public_key)
    having count(*) > 1
  ) then
    raise exception 'duplicate_agent_public_key_fingerprint'
      using errcode = 'unique_violation';
  end if;
end
$function$;

-- ======================================================== 2. version store
alter table public.agents
  add column if not exists current_key_version integer not null default 1,
  add column if not exists key_recovery_hold_version integer;

create table if not exists public.agent_key_versions (
  agent_id uuid not null references public.agents(id) on delete restrict,
  version integer not null,
  public_key text not null,
  fingerprint text not null,
  activated_at timestamptz not null default now(),
  activated_by uuid not null,
  authorization_method text not null,
  continuity_proven boolean not null default false,
  possession_proven boolean not null default false,
  predecessor_version integer,
  predecessor_disposition text,
  change_reason text not null,
  request_id uuid not null,

  primary key (agent_id, version),
  constraint agent_key_versions_version_check check (version >= 1),
  constraint agent_key_versions_public_key_check
    check (public_key ~ '^ed25519:[A-Za-z0-9+/]{43}=$'),
  constraint agent_key_versions_fingerprint_check
    check (fingerprint ~ '^[0-9a-f]{64}$'),
  constraint agent_key_versions_method_check
    check (authorization_method in ('initial', 'legacy_import', 'old_key_proof', 'owner_recovery')),
  constraint agent_key_versions_disposition_check
    check (predecessor_disposition is null or predecessor_disposition in ('routine', 'lost', 'compromised')),
  constraint agent_key_versions_reason_check check (length(change_reason) between 3 and 240),
  constraint agent_key_versions_request_key unique (agent_id, request_id),
  constraint agent_key_versions_shape_check check (
    (
      version = 1
      and predecessor_version is null
      and predecessor_disposition is null
      and authorization_method in ('initial', 'legacy_import')
      and not continuity_proven
      and not possession_proven
    )
    or
    (
      version > 1
      and predecessor_version = version - 1
      and predecessor_disposition = 'routine'
      and authorization_method = 'old_key_proof'
      and continuity_proven
      and possession_proven
    )
    or
    (
      version > 1
      and predecessor_version = version - 1
      and predecessor_disposition in ('lost', 'compromised')
      and authorization_method = 'owner_recovery'
      and not continuity_proven
      and possession_proven
    )
  )
);

create unique index if not exists agent_key_versions_fingerprint_key
  on public.agent_key_versions (fingerprint);
create index if not exists agent_key_versions_agent_activated_idx
  on public.agent_key_versions (agent_id, activated_at desc);

insert into public.agent_key_versions (
  agent_id, version, public_key, fingerprint, activated_at, activated_by,
  authorization_method, continuity_proven, possession_proven,
  predecessor_version, predecessor_disposition, change_reason, request_id
)
select
  a.id, 1, a.public_key, public.agent_public_key_fingerprint(a.public_key),
  a.created_at, a.owner_id, 'legacy_import', false, false,
  null, null, 'Imported current key at versioning cutover', a.id
from public.agents a
on conflict (agent_id, version) do nothing;

do $function$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'agents_current_key_fk'
  ) then
    alter table public.agents
      add constraint agents_current_key_fk
      foreign key (id, current_key_version)
      references public.agent_key_versions(agent_id, version)
      deferrable initially deferred;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'agents_key_recovery_hold_fk'
  ) then
    alter table public.agents
      add constraint agents_key_recovery_hold_fk
      foreign key (id, key_recovery_hold_version)
      references public.agent_key_versions(agent_id, version)
      deferrable initially deferred;
  end if;
end
$function$;

alter table public.agent_key_versions enable row level security;
revoke all on public.agent_key_versions from anon, authenticated;
grant select on public.agent_key_versions to authenticated;

drop policy if exists "owner reads agent key versions" on public.agent_key_versions;
create policy "owner reads agent key versions"
  on public.agent_key_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.agents a
       where a.id = agent_key_versions.agent_id
         and a.owner_id = (select auth.uid())
    )
  );

create table if not exists public.agent_key_change_requests (
  agent_id uuid not null references public.agents(id) on delete restrict,
  request_id uuid not null,
  expected_version integer not null,
  expected_fingerprint text not null,
  new_public_key text not null,
  new_fingerprint text not null,
  mode text not null,
  disposition text not null,
  change_reason text not null,
  proof_expires_at timestamptz not null,
  old_signature text not null default '',
  new_signature text not null,
  signed_material text not null,
  signed_material_sha256 text not null,
  recent_auth_at timestamptz,
  result_version integer not null,
  result text not null,
  created_at timestamptz not null default now(),

  primary key (agent_id, request_id),
  constraint agent_key_change_requests_expected_fk
    foreign key (agent_id, expected_version)
    references public.agent_key_versions(agent_id, version) on delete restrict,
  constraint agent_key_change_requests_result_fk
    foreign key (agent_id, result_version)
    references public.agent_key_versions(agent_id, version) on delete restrict,
  constraint agent_key_change_requests_fingerprint_check
    check (expected_fingerprint ~ '^[0-9a-f]{64}$' and new_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint agent_key_change_requests_mode_check check (mode in ('rotate', 'recover')),
  constraint agent_key_change_requests_disposition_check check (disposition in ('routine', 'lost', 'compromised')),
  constraint agent_key_change_requests_reason_check check (length(change_reason) between 3 and 240),
  constraint agent_key_change_requests_signature_check check (
    new_signature ~ '^[A-Za-z0-9_-]{86}$'
    and (old_signature = '' or old_signature ~ '^[A-Za-z0-9_-]{86}$')
  ),
  constraint agent_key_change_requests_material_check check (
    length(signed_material) between 1 and 2000
    and signed_material_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint agent_key_change_requests_result_check check (result in ('rotated', 'recovered')),
  constraint agent_key_change_requests_shape_check check (
    (
      mode = 'rotate' and disposition = 'routine' and old_signature <> '' and recent_auth_at is null
      and result = 'rotated'
    )
    or
    (
      mode = 'recover' and disposition in ('lost', 'compromised') and old_signature = ''
      and recent_auth_at is not null and result = 'recovered'
    )
  )
);

alter table public.agent_key_change_requests enable row level security;
revoke all on public.agent_key_change_requests from anon, authenticated;

create or replace function public.reject_agent_key_history_mutation()
  returns trigger
  language plpgsql
  set search_path to 'public'
as $function$
begin
  raise exception 'agent_key_history_is_append_only' using errcode = 'insufficient_privilege';
end
$function$;

revoke execute on function public.reject_agent_key_history_mutation()
  from public, anon, authenticated;

drop trigger if exists agent_key_versions_immutable on public.agent_key_versions;
create trigger agent_key_versions_immutable
  before update or delete on public.agent_key_versions
  for each row execute function public.reject_agent_key_history_mutation();
drop trigger if exists agent_key_versions_no_truncate on public.agent_key_versions;
create trigger agent_key_versions_no_truncate
  before truncate on public.agent_key_versions
  for each statement execute function public.reject_agent_key_history_mutation();
drop trigger if exists agent_key_requests_immutable on public.agent_key_change_requests;
create trigger agent_key_requests_immutable
  before update or delete on public.agent_key_change_requests
  for each row execute function public.reject_agent_key_history_mutation();
drop trigger if exists agent_key_requests_no_truncate on public.agent_key_change_requests;
create trigger agent_key_requests_no_truncate
  before truncate on public.agent_key_change_requests
  for each statement execute function public.reject_agent_key_history_mutation();

comment on table public.agent_key_versions is
  'Append-only agent authenticator history. Old keys remain historical evidence; only the pointed version is current authority. Database-owner enforcement limits still apply.';
comment on table public.agent_key_change_requests is
  'Append-only idempotency and proof-evidence ledger for key rotation/recovery. No private key material and no API-role access.';

-- ========================================================= 3. rollout gates
insert into public.product_capabilities (capability, enabled, enabled_at)
values
  ('agent_key_rotation', false, null),
  ('agent_key_recovery', false, null)
on conflict (capability) do nothing;

-- ==================================================== 4. evidence provenance
alter table public.agent_challenges
  add column if not exists key_version integer;
alter table public.agent_events
  add column if not exists key_version integer,
  add column if not exists signature_scheme text not null default '',
  add column if not exists signed_material_sha256 text not null default '';
alter table public.approval_requests
  add column if not exists key_version integer;
alter table public.agent_usage
  add column if not exists key_version integer;

do $function$
begin
  if not exists (select 1 from pg_constraint where conname = 'agent_challenges_key_fk') then
    alter table public.agent_challenges
      add constraint agent_challenges_key_fk
      foreign key (agent_id, key_version)
      references public.agent_key_versions(agent_id, version) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'agent_events_key_fk') then
    alter table public.agent_events
      add constraint agent_events_key_fk
      foreign key (agent_id, key_version)
      references public.agent_key_versions(agent_id, version) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'approval_requests_key_fk') then
    alter table public.approval_requests
      add constraint approval_requests_key_fk
      foreign key (agent_id, key_version)
      references public.agent_key_versions(agent_id, version) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'agent_usage_key_fk') then
    alter table public.agent_usage
      add constraint agent_usage_key_fk
      foreign key (agent_id, key_version)
      references public.agent_key_versions(agent_id, version) on delete restrict;
  end if;
end
$function$;

-- Existing mandate-era rows were created while the agent key was still
-- immutable. Their provenance is safely attributable to imported key v1.
-- Future legacy writes are filled by the compatibility triggers below.
update public.approval_requests r
   set key_version = a.current_key_version
  from public.agents a
 where r.agent_id = a.id
   and r.key_version is null
   and a.current_key_version = 1;
update public.agent_usage u
   set key_version = a.current_key_version
  from public.agents a
 where u.agent_id = a.id
   and u.key_version is null
   and a.current_key_version = 1;
update public.agent_challenges c
   set key_version = a.current_key_version
  from public.agents a
 where c.agent_id = a.id
   and c.key_version is null
   and a.current_key_version = 1;
update public.agent_events e
   set key_version = a.current_key_version
  from public.agents a
 where e.agent_id = a.id
   and e.signer = 'agent'
   and e.key_version is null
   and a.current_key_version = 1;

create or replace function public.agent_key_change_enabled()
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  select exists (
    select 1 from public.product_capabilities
     where capability in ('agent_key_rotation', 'agent_key_recovery') and enabled
  )
$function$;

revoke execute on function public.agent_key_change_enabled()
  from public, anon, authenticated;

create or replace function public.require_agent_event_key_evidence()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  _compat boolean := false;
begin
  if NEW.signer <> 'agent' then return NEW; end if;

  if NEW.key_version is null then
    if public.agent_key_change_enabled() then
      raise exception 'agent_event_key_version_required' using errcode = 'not_null_violation';
    end if;
    select current_key_version into NEW.key_version from public.agents where id = NEW.agent_id;
    _compat := true;
  end if;

  if not _compat and (
    NEW.signature_scheme <> 'infinity-pop-v1'
    or NEW.signed_material_sha256 !~ '^[0-9a-f]{64}$'
  ) then
    raise exception 'agent_event_signed_material_required' using errcode = 'invalid_parameter_value';
  end if;
  return NEW;
end
$function$;

create or replace function public.require_challenge_key_version()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if NEW.key_version is null then
    if public.agent_key_change_enabled() then
      raise exception 'challenge_key_version_required' using errcode = 'not_null_violation';
    end if;
    select current_key_version into NEW.key_version from public.agents where id = NEW.agent_id;
  end if;
  return NEW;
end
$function$;

create or replace function public.require_evidence_key_version()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if NEW.key_version is null then
    if public.agent_key_change_enabled() then
      raise exception 'key_version_required' using errcode = 'not_null_violation';
    end if;
    select current_key_version into NEW.key_version from public.agents where id = NEW.agent_id;
  end if;
  return NEW;
end
$function$;

revoke execute on function public.require_agent_event_key_evidence()
  from public, anon, authenticated;
revoke execute on function public.require_challenge_key_version()
  from public, anon, authenticated;
revoke execute on function public.require_evidence_key_version()
  from public, anon, authenticated;

drop trigger if exists agent_events_00_require_key_evidence on public.agent_events;
create trigger agent_events_00_require_key_evidence
  before insert on public.agent_events
  for each row execute function public.require_agent_event_key_evidence();
drop trigger if exists agent_challenges_require_key_version on public.agent_challenges;
create trigger agent_challenges_require_key_version
  before insert on public.agent_challenges
  for each row execute function public.require_challenge_key_version();
drop trigger if exists approval_requests_require_key_version on public.approval_requests;
create trigger approval_requests_require_key_version
  before insert on public.approval_requests
  for each row execute function public.require_evidence_key_version();
drop trigger if exists agent_usage_require_key_version on public.agent_usage;
create trigger agent_usage_require_key_version
  before insert on public.agent_usage
  for each row execute function public.require_evidence_key_version();

-- v3 commits every authorship/proof field and serializes the chain per agent.
-- Existing v1/v2 hashes are historical links and are never recomputed.
create or replace function public.chain_event()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public', 'extensions'
as $function$
declare
  _last text;
  _payload text;
begin
  perform pg_advisory_xact_lock(hashtextextended(NEW.agent_id::text, 0));
  select hash into _last
    from public.agent_events
   where agent_id = NEW.agent_id
   order by id desc
   limit 1;

  NEW.prev_hash := coalesce(_last, 'genesis');
  _payload :=
    'v3' || ':' ||
    length(NEW.prev_hash) || ':' || NEW.prev_hash || ':' ||
    length(NEW.agent_id::text) || ':' || NEW.agent_id::text || ':' ||
    length(NEW.kind) || ':' || NEW.kind || ':' ||
    length(coalesce(NEW.detail, '')) || ':' || coalesce(NEW.detail, '') || ':' ||
    length(coalesce(NEW.signer, '')) || ':' || coalesce(NEW.signer, '') || ':' ||
    length(coalesce(NEW.signature, '')) || ':' || coalesce(NEW.signature, '') || ':' ||
    length(coalesce(NEW.nonce, '')) || ':' || coalesce(NEW.nonce, '') || ':' ||
    length(coalesce(NEW.key_version::text, '')) || ':' || coalesce(NEW.key_version::text, '') || ':' ||
    length(coalesce(NEW.signature_scheme, '')) || ':' || coalesce(NEW.signature_scheme, '') || ':' ||
    length(coalesce(NEW.signed_material_sha256, '')) || ':' || coalesce(NEW.signed_material_sha256, '') || ':' ||
    length(NEW.created_at::text) || ':' || NEW.created_at::text;

  NEW.hash := encode(extensions.digest(_payload, 'sha256'), 'hex');
  return NEW;
end
$function$;

revoke execute on function public.chain_event() from public, anon, authenticated;
comment on function public.chain_event() is
  'Appends serialized v3 SHA-256 links committing authorship and key provenance. Tamper-evident only while the database operator is trusted.';

create or replace function public.reject_agent_event_mutation()
  returns trigger
  language plpgsql
  set search_path to 'public'
as $function$
begin
  raise exception 'agent_events_are_append_only' using errcode = 'insufficient_privilege';
end
$function$;

revoke execute on function public.reject_agent_event_mutation()
  from public, anon, authenticated;

drop trigger if exists agent_events_immutable on public.agent_events;
create trigger agent_events_immutable
  before update or delete on public.agent_events
  for each row execute function public.reject_agent_event_mutation();

-- ================================================== 5. projection integrity
create or replace function public.guard_agent_identity_and_mandate()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public', 'extensions'
as $function$
declare
  _key_changed boolean;
  _mandate_changed boolean;
  _hold_changed boolean;
  _key_mode text;
begin
  if TG_OP = 'INSERT' then
    if auth.uid() is not null then
      NEW.public_id := public.gen_agent_public_id();
      NEW.status := 'valid';
      NEW.created_at := now();
    end if;
    NEW.current_mandate_version := 1;
    NEW.current_key_version := 1;
    NEW.key_recovery_hold_version := null;
    NEW.issuance_request_id := coalesce(NEW.issuance_request_id, extensions.gen_random_uuid());
    perform public.agent_public_key_fingerprint(NEW.public_key);

    if length(btrim(coalesce(NEW.name, ''))) not between 1 and 60
       or length(btrim(coalesce(NEW.source, ''))) not between 1 and 80
       or cardinality(coalesce(NEW.permissions, '{}'::text[])) = 0
       or exists (
         select 1 from unnest(NEW.permissions) permission
          where permission is null or btrim(permission) = '' or length(btrim(permission)) > 80
       )
       or NEW.monthly_spend_limit is null
       or NEW.monthly_spend_limit not between 0 and 1000000
       or (NEW.approval_above is not null and NEW.approval_above not between 0 and NEW.monthly_spend_limit)
       or NEW.expires_at is null or NEW.expires_at <= NEW.created_at then
      raise exception 'invalid_agent_mandate' using errcode = 'invalid_parameter_value';
    end if;
    return NEW;
  end if;

  if NEW.id is distinct from OLD.id
     or NEW.public_id is distinct from OLD.public_id
     or NEW.owner_id is distinct from OLD.owner_id
     or NEW.name is distinct from OLD.name
     or NEW.source is distinct from OLD.source
     or NEW.created_at is distinct from OLD.created_at
     or NEW.issuance_request_id is distinct from OLD.issuance_request_id then
    raise exception 'agent_identity_is_immutable' using errcode = 'insufficient_privilege';
  end if;

  _key_changed := NEW.public_key is distinct from OLD.public_key
    or NEW.current_key_version is distinct from OLD.current_key_version;
  _mandate_changed := NEW.permissions is distinct from OLD.permissions
    or NEW.monthly_spend_limit is distinct from OLD.monthly_spend_limit
    or NEW.approval_above is distinct from OLD.approval_above
    or NEW.expires_at is distinct from OLD.expires_at
    or NEW.current_mandate_version is distinct from OLD.current_mandate_version;
  _hold_changed := NEW.key_recovery_hold_version is distinct from OLD.key_recovery_hold_version;

  if _key_changed then
    if _mandate_changed or current_setting('infinity.key_change', true) is distinct from '1' then
      raise exception 'agent_key_requires_lifecycle_rpc' using errcode = 'insufficient_privilege';
    end if;
    _key_mode := current_setting('infinity.key_change_mode', true);
    if NEW.current_key_version <> OLD.current_key_version + 1
       or not exists (
         select 1 from public.agent_key_versions k
          where k.agent_id = OLD.id
            and k.version = NEW.current_key_version
            and k.public_key = NEW.public_key
       )
       or (_key_mode = 'rotate' and (
         NEW.status is distinct from OLD.status
         or OLD.key_recovery_hold_version is not null
         or NEW.key_recovery_hold_version is not null
       ))
       or (_key_mode = 'recover' and (
         NEW.status <> 'frozen'
         or NEW.key_recovery_hold_version <> NEW.current_key_version
       ))
       or _key_mode not in ('rotate', 'recover') then
      raise exception 'agent_projection_must_match_next_key'
        using errcode = 'integrity_constraint_violation';
    end if;
  end if;

  if _hold_changed and not _key_changed then
    if current_setting('infinity.recovery_hold_clear', true) is distinct from '1'
       or OLD.key_recovery_hold_version is null
       or OLD.key_recovery_hold_version <> OLD.current_key_version
       or NEW.key_recovery_hold_version is not null
       or NEW.status is distinct from OLD.status
       or _mandate_changed then
      raise exception 'recovery_hold_requires_current_key_proof'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if not _key_changed and not _mandate_changed and not _hold_changed
     and NEW.status = 'valid' and OLD.status = 'frozen'
     and OLD.key_recovery_hold_version is not null then
    raise exception 'recovery_hold_active' using errcode = 'object_not_in_prerequisite_state';
  end if;

  if _mandate_changed then
    if _key_changed or current_setting('infinity.mandate_reissue', true) is distinct from '1' then
      raise exception 'agent_mandate_requires_lifecycle_rpc'
        using errcode = 'insufficient_privilege';
    end if;
    if NEW.status is distinct from OLD.status
       or NEW.current_mandate_version <> OLD.current_mandate_version + 1
       or not exists (
         select 1 from public.agent_mandate_versions m
          where m.agent_id = OLD.id
            and m.version = NEW.current_mandate_version
            and m.permissions = NEW.permissions
            and m.monthly_spend_limit = NEW.monthly_spend_limit
            and m.approval_above is not distinct from NEW.approval_above
            and m.expires_at = NEW.expires_at
       ) then
      raise exception 'agent_projection_must_match_next_mandate'
        using errcode = 'integrity_constraint_violation';
    end if;
  end if;
  return NEW;
end
$function$;

revoke execute on function public.guard_agent_identity_and_mandate()
  from public, anon, authenticated;

create or replace function public.agent_key_snapshot_hash(_agent_id uuid, _version integer)
  returns text
  language sql
  stable
  security definer
  set search_path to 'public', 'extensions'
as $function$
  select encode(extensions.digest(
    jsonb_build_object(
      'agent_id', k.agent_id,
      'version', k.version,
      'public_key', k.public_key,
      'fingerprint', k.fingerprint,
      'activated_at_us', (extract(epoch from k.activated_at) * 1000000)::bigint,
      'activated_by', k.activated_by,
      'authorization_method', k.authorization_method,
      'continuity_proven', k.continuity_proven,
      'possession_proven', k.possession_proven,
      'predecessor_version', k.predecessor_version,
      'predecessor_disposition', k.predecessor_disposition,
      'change_reason', k.change_reason,
      'request_id', k.request_id
    )::text,
    'sha256'
  ), 'hex')
  from public.agent_key_versions k
  where k.agent_id = _agent_id and k.version = _version
$function$;

revoke execute on function public.agent_key_snapshot_hash(uuid, integer)
  from public, anon, authenticated;

create or replace function public.create_initial_agent_key_version()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  insert into public.agent_key_versions (
    agent_id, version, public_key, fingerprint, activated_at, activated_by,
    authorization_method, continuity_proven, possession_proven,
    predecessor_version, predecessor_disposition, change_reason, request_id
  ) values (
    NEW.id, 1, NEW.public_key, public.agent_public_key_fingerprint(NEW.public_key),
    NEW.created_at, NEW.owner_id, 'initial', false, false,
    null, null, 'Initial agent key', NEW.issuance_request_id
  );

  insert into public.agent_events (agent_id, kind, detail, signer)
  values (
    NEW.id,
    'key_issued',
    'Key v1 snapshot sha256 ' || public.agent_key_snapshot_hash(NEW.id, 1),
    'owner'
  );
  return NEW;
end
$function$;

revoke execute on function public.create_initial_agent_key_version()
  from public, anon, authenticated;

drop trigger if exists agents_create_initial_key on public.agents;
create trigger agents_create_initial_key
  after insert on public.agents
  for each row execute function public.create_initial_agent_key_version();

-- Anchor imported keys after v3 chaining is active.
insert into public.agent_events (agent_id, kind, detail, signer)
select
  k.agent_id,
  'key_issued',
  'Key v1 snapshot sha256 ' || public.agent_key_snapshot_hash(k.agent_id, 1) ||
    ' · imported at key versioning cutover',
  'owner'
from public.agent_key_versions k
where k.version = 1
  and k.authorization_method = 'legacy_import'
  and not exists (
    select 1 from public.agent_events e
     where e.agent_id = k.agent_id
       and e.kind = 'key_issued'
       and e.detail like 'Key v1 snapshot sha256 %'
  );

-- ===================================================== 6. key change RPC
create or replace function public.change_agent_key(
  _owner_id uuid,
  _agent_id uuid,
  _expected_version integer,
  _expected_fingerprint text,
  _new_public_key text,
  _new_fingerprint text,
  _request_id uuid,
  _mode text,
  _disposition text,
  _change_reason text,
  _proof_expires_at timestamptz,
  _old_signature text,
  _new_signature text,
  _signed_material text,
  _signed_material_sha256 text,
  _recent_auth_at timestamptz default null
)
  returns table(key_version integer, activated_at timestamptz, result text, agent_status text)
  language plpgsql
  volatile
  security definer
  set search_path to 'public', 'extensions'
as $function$
declare
  _agent public.agents;
  _request public.agent_key_change_requests;
  _next integer;
  _activated_at timestamptz := statement_timestamp();
  _result text;
begin
  if _owner_id is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if _mode not in ('rotate', 'recover') then
    raise exception 'invalid_key_change_mode' using errcode = 'invalid_parameter_value';
  end if;
  if not exists (
    select 1 from public.product_capabilities
     where capability = case when _mode = 'rotate' then 'agent_key_rotation' else 'agent_key_recovery' end
       and enabled
  ) then
    if _mode = 'rotate' then
      raise exception 'agent_key_rotation_not_enabled'
        using errcode = 'object_not_in_prerequisite_state';
    else
      raise exception 'agent_key_recovery_not_enabled'
        using errcode = 'object_not_in_prerequisite_state';
    end if;
  end if;

  if _request_id is null
     or _expected_version is null or _expected_version < 1
     or _expected_fingerprint !~ '^[0-9a-f]{64}$'
     or _new_fingerprint !~ '^[0-9a-f]{64}$'
     or length(btrim(coalesce(_change_reason, ''))) not between 3 and 240
     or _proof_expires_at is null
     or length(coalesce(_signed_material, '')) not between 1 and 2000
     or _signed_material_sha256 !~ '^[0-9a-f]{64}$'
     or coalesce(_new_signature, '') !~ '^[A-Za-z0-9_-]{86}$'
     or public.agent_public_key_fingerprint(_new_public_key) <> _new_fingerprint
     or encode(extensions.digest(_signed_material, 'sha256'), 'hex') <> _signed_material_sha256 then
    raise exception 'invalid_key_change_request' using errcode = 'invalid_parameter_value';
  end if;

  select * into _agent
    from public.agents a
   where a.id = _agent_id and a.owner_id = _owner_id
   for no key update;
  if not found then
    raise exception 'agent_not_found_or_not_yours' using errcode = 'no_data_found';
  end if;

  select * into _request
    from public.agent_key_change_requests r
   where r.agent_id = _agent_id and r.request_id = _request_id;
  if found then
    if _request.expected_version is distinct from _expected_version
       or _request.expected_fingerprint is distinct from _expected_fingerprint
       or _request.new_public_key is distinct from _new_public_key
       or _request.new_fingerprint is distinct from _new_fingerprint
       or _request.mode is distinct from _mode
       or _request.disposition is distinct from _disposition
       or _request.change_reason is distinct from btrim(_change_reason)
       or _request.proof_expires_at is distinct from _proof_expires_at
       or _request.old_signature is distinct from coalesce(_old_signature, '')
       or _request.new_signature is distinct from _new_signature
       or _request.signed_material is distinct from _signed_material
       or _request.signed_material_sha256 is distinct from _signed_material_sha256
       or _request.recent_auth_at is distinct from _recent_auth_at then
      raise exception 'idempotency_conflict' using errcode = 'unique_violation';
    end if;
    select activated_at into _activated_at
      from public.agent_key_versions
     where agent_id = _agent_id and version = _request.result_version;
    return query select _request.result_version, _activated_at,
      ('already_' || _request.result)::text, _agent.status;
    return;
  end if;

  if _agent.current_key_version <> _expected_version
     or public.agent_public_key_fingerprint(_agent.public_key) <> _expected_fingerprint then
    raise exception 'key_version_conflict' using errcode = 'serialization_failure';
  end if;
  if _new_fingerprint = _expected_fingerprint
     or exists (select 1 from public.agent_key_versions where fingerprint = _new_fingerprint) then
    raise exception 'agent_key_already_used' using errcode = 'unique_violation';
  end if;
  if _proof_expires_at <= statement_timestamp()
     or _proof_expires_at > statement_timestamp() + interval '10 minutes' then
    raise exception 'key_change_proof_expired' using errcode = 'invalid_parameter_value';
  end if;

  if _mode = 'rotate' then
    if _disposition <> 'routine'
       or _agent.key_recovery_hold_version is not null
       or coalesce(_old_signature, '') !~ '^[A-Za-z0-9_-]{86}$'
       or _recent_auth_at is not null then
      raise exception 'invalid_rotation_evidence' using errcode = 'invalid_parameter_value';
    end if;
    _result := 'rotated';
  else
    if _disposition not in ('lost', 'compromised')
       or coalesce(_old_signature, '') <> ''
       or _recent_auth_at is null
       or _recent_auth_at < statement_timestamp() - interval '10 minutes'
       or _recent_auth_at > statement_timestamp() + interval '1 minute' then
      raise exception 'recent_authentication_required' using errcode = 'insufficient_privilege';
    end if;
    _result := 'recovered';
  end if;

  _next := _agent.current_key_version + 1;
  insert into public.agent_key_versions (
    agent_id, version, public_key, fingerprint, activated_at, activated_by,
    authorization_method, continuity_proven, possession_proven,
    predecessor_version, predecessor_disposition, change_reason, request_id
  ) values (
    _agent.id, _next, _new_public_key, _new_fingerprint, _activated_at, _owner_id,
    case when _mode = 'rotate' then 'old_key_proof' else 'owner_recovery' end,
    (_mode = 'rotate'), true, _agent.current_key_version, _disposition,
    btrim(_change_reason), _request_id
  );

  insert into public.agent_key_change_requests (
    agent_id, request_id, expected_version, expected_fingerprint,
    new_public_key, new_fingerprint, mode, disposition, change_reason,
    proof_expires_at, old_signature, new_signature, signed_material,
    signed_material_sha256, recent_auth_at, result_version, result
  ) values (
    _agent.id, _request_id, _expected_version, _expected_fingerprint,
    _new_public_key, _new_fingerprint, _mode, _disposition, btrim(_change_reason),
    _proof_expires_at, coalesce(_old_signature, ''), _new_signature, _signed_material,
    _signed_material_sha256, _recent_auth_at, _next, _result
  );

  perform set_config('infinity.key_change', '1', true);
  perform set_config('infinity.key_change_mode', _mode, true);
  update public.agents
     set public_key = _new_public_key,
         current_key_version = _next,
         key_recovery_hold_version = case when _mode = 'recover' then _next else null end,
         status = case when _mode = 'recover' then 'frozen' else status end
   where id = _agent.id;

  insert into public.agent_events (agent_id, kind, detail, signer)
  values (
    _agent.id,
    case when _mode = 'rotate' then 'key_rotated' else 'key_recovered' end,
    'Key v' || _next || ' snapshot sha256 ' || public.agent_key_snapshot_hash(_agent.id, _next) ||
      ' · predecessor ' || _disposition || ' · signed material sha256 ' || _signed_material_sha256 ||
      ' · reason: ' || left(btrim(_change_reason), 120),
    'owner'
  );

  return query select _next, _activated_at, _result,
    case when _mode = 'recover' then 'frozen' else _agent.status end;
end
$function$;

revoke execute on function public.change_agent_key(
  uuid, uuid, integer, text, text, text, uuid, text, text, text,
  timestamptz, text, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.change_agent_key(
  uuid, uuid, integer, text, text, text, uuid, text, text, text,
  timestamptz, text, text, text, text, timestamptz
) to service_role;

comment on function public.change_agent_key(
  uuid, uuid, integer, text, text, text, uuid, text, text, text,
  timestamptz, text, text, text, text, timestamptz
) is 'After application-side old/new Ed25519 verification and recent-auth checks, atomically appends and activates a new agent key. service_role only.';

-- Recovery is two-step: key replacement sets a durable hold, and ordinary
-- owner unfreeze remains blocked until a service-verified current-key proof
-- clears it.
create or replace function public.set_agent_status(
  _agent_id uuid,
  _expected_status text,
  _new_status text
)
  returns text
  language plpgsql
  volatile
  security definer
  set search_path to 'public'
as $function$
declare _agent public.agents;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if _expected_status not in ('valid', 'frozen') or _new_status not in ('valid', 'frozen') then
    raise exception 'invalid_status' using errcode = 'invalid_parameter_value';
  end if;

  select * into _agent from public.agents a
   where a.id = _agent_id and a.owner_id = auth.uid()
   for no key update;
  if not found then
    raise exception 'agent_not_found_or_not_yours' using errcode = 'no_data_found';
  end if;
  if _agent.status = _new_status then return _new_status; end if;
  if _agent.status <> _expected_status then
    raise exception 'status_conflict' using errcode = 'serialization_failure';
  end if;
  if _new_status = 'valid' and _agent.key_recovery_hold_version is not null then
    raise exception 'recovery_hold_active' using errcode = 'object_not_in_prerequisite_state';
  end if;

  update public.agents set status = _new_status where id = _agent_id;
  return _new_status;
end
$function$;

revoke execute on function public.set_agent_status(uuid, text, text) from public, anon;
grant execute on function public.set_agent_status(uuid, text, text) to authenticated;

create or replace function public.record_recovery_key_confirmation(
  _public_id text,
  _nonce text,
  _signature text,
  _expected_key_version integer,
  _signed_material_sha256 text
)
  returns table(event_id bigint, hash text, key_version integer)
  language plpgsql
  volatile
  security definer
  set search_path to 'public'
as $function$
declare
  _agent public.agents;
  _event_id bigint;
  _hash text;
begin
  if coalesce(_signature, '') !~ '^[A-Za-z0-9_-]{86}$'
     or _signed_material_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_recovery_confirmation_evidence'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into _agent from public.agents a
   where a.public_id = _public_id
     and a.status = 'frozen'
   for no key update;
  if not found
     or _agent.current_key_version <> _expected_key_version
     or _agent.key_recovery_hold_version is distinct from _expected_key_version then
    raise exception 'recovery_hold_not_current' using errcode = 'object_not_in_prerequisite_state';
  end if;

  insert into public.agent_challenges (
    nonce, agent_id, key_version, purpose, created_at, expires_at, consumed_at
  ) values (
    _nonce, _agent.id, _expected_key_version, 'recovery_key_confirmation', now(), now(), now()
  ) on conflict (nonce) do nothing;
  if not found then
    raise exception 'challenge_invalid_or_replayed' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.agent_events (
    agent_id, kind, detail, signer, signature, nonce, key_version,
    signature_scheme, signed_material_sha256
  ) values (
    _agent.id, 'recovery_key_confirmed',
    'Recovered key v' || _expected_key_version || ' proved possession; owner unfreeze remains separate',
    'agent', _signature, _nonce, _expected_key_version,
    'infinity-pop-v1', _signed_material_sha256
  ) returning id, agent_events.hash into _event_id, _hash;

  perform set_config('infinity.recovery_hold_clear', '1', true);
  update public.agents
     set key_recovery_hold_version = null
   where id = _agent.id;

  return query select _event_id, _hash, _expected_key_version;
end
$function$;

revoke execute on function public.record_recovery_key_confirmation(text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.record_recovery_key_confirmation(text, text, text, integer, text)
  to service_role;

-- ============================================= 7. key-aware signed actions
create or replace function public.record_signed_action_v2(
  _public_id text,
  _nonce text,
  _kind text,
  _detail text,
  _signature text,
  _expected_key_version integer,
  _signed_material_sha256 text
)
  returns table(event_id bigint, hash text, key_version integer)
  language plpgsql
  volatile
  security definer
  set search_path to 'public'
as $function$
declare
  _agent public.agents;
  _event_id bigint;
  _hash text;
begin
  if coalesce(_signature, '') !~ '^[A-Za-z0-9_-]{86}$'
     or _signed_material_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_signed_action_evidence' using errcode = 'invalid_parameter_value';
  end if;

  select * into _agent
    from public.agents a
   where a.public_id = _public_id
     and a.status = 'valid'
     and a.expires_at > now()
   for no key update;
  if not found then
    raise exception 'unknown_or_unusable_agent' using errcode = 'no_data_found';
  end if;
  if _agent.current_key_version <> _expected_key_version then
    raise exception 'key_version_conflict' using errcode = 'serialization_failure';
  end if;

  delete from public.agent_challenges c
   where c.nonce in (
     select old.nonce from public.agent_challenges old
      where old.consumed_at is not null
        and old.expires_at < now() - interval '10 minutes'
      order by old.expires_at
      limit 1000
   );

  insert into public.agent_challenges (
    nonce, agent_id, key_version, purpose, created_at, expires_at, consumed_at
  ) values (
    _nonce, _agent.id, _expected_key_version, 'mcp_authorization', now(), now(), now()
  ) on conflict (nonce) do nothing;
  if not found then
    raise exception 'challenge_invalid_or_replayed' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.agent_events (
    agent_id, kind, detail, signer, signature, nonce, key_version,
    signature_scheme, signed_material_sha256
  ) values (
    _agent.id, _kind, coalesce(_detail, ''), 'agent', _signature, _nonce,
    _expected_key_version, 'infinity-pop-v1', _signed_material_sha256
  ) returning id, agent_events.hash into _event_id, _hash;

  return query select _event_id, _hash, _expected_key_version;
end
$function$;

revoke execute on function public.record_signed_action_v2(text, text, text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.record_signed_action_v2(text, text, text, text, text, integer, text)
  to service_role;

-- ========================================== 8. key-aware approval functions
create or replace function public.create_approval_request_v2(
  _public_id text,
  _action text,
  _amount_usd numeric,
  _expected_key_version integer
)
  returns table(reference text, status text, expires_at timestamptz)
  language plpgsql
  volatile
  security definer
  set search_path to 'public', 'extensions'
as $function$
declare
  _agent public.agents;
  _ref text;
begin
  select * into _agent from public.agents a
   where a.public_id = _public_id and a.status = 'valid' and a.expires_at > now()
   for no key update;
  if not found then
    raise exception 'unknown_or_unusable_agent' using errcode = 'no_data_found';
  end if;
  if _agent.current_key_version <> _expected_key_version then
    raise exception 'key_version_conflict' using errcode = 'serialization_failure';
  end if;

  _ref := 'apr_' || encode(extensions.gen_random_bytes(16), 'hex');
  insert into public.approval_requests (
    agent_id, action, amount_usd, reference, mandate_version, key_version
  ) values (
    _agent.id, _action, coalesce(_amount_usd, 0), _ref,
    _agent.current_mandate_version, _agent.current_key_version
  );

  insert into public.agent_events (agent_id, kind, detail, signer, key_version)
  values (
    _agent.id, 'approval_requested',
    'Mandate v' || _agent.current_mandate_version || ' · key v' || _agent.current_key_version ||
      ': ' || left(_action, 250),
    'infinity', _agent.current_key_version
  );
  return query select _ref, 'pending'::text, (now() + interval '24 hours')::timestamptz;
end
$function$;

revoke execute on function public.create_approval_request_v2(text, text, numeric, integer)
  from public, anon, authenticated;
grant execute on function public.create_approval_request_v2(text, text, numeric, integer)
  to service_role;

create or replace function public.approval_state_v2(_public_id text, _reference text)
  returns table(
    status text,
    amount_usd numeric,
    action text,
    expires_at timestamptz,
    consumed boolean,
    mandate_version integer,
    current_mandate_version integer,
    key_version integer,
    current_key_version integer
  )
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  select
    case
      when r.mandate_version is null or r.mandate_version <> a.current_mandate_version then 'superseded'
      when (
        r.key_version is null
        and not public.agent_key_change_enabled()
        and a.current_key_version = 1
      ) then r.status
      when r.key_version is null or r.key_version <> a.current_key_version then 'superseded'
      when r.status = 'pending' and r.expires_at <= now() then 'expired'
      else r.status
    end,
    r.amount_usd,
    r.action,
    r.expires_at,
    (r.consumed_at is not null),
    r.mandate_version,
    a.current_mandate_version,
    r.key_version,
    a.current_key_version
  from public.approval_requests r
  join public.agents a on a.id = r.agent_id
  where r.reference = _reference and a.public_id = _public_id
$function$;

revoke execute on function public.approval_state_v2(text, text)
  from public, anon, authenticated;
grant execute on function public.approval_state_v2(text, text) to service_role;

create or replace function public.reserve_spend_v2(
  _public_id text,
  _amount_usd numeric,
  _detail text,
  _reference text,
  _expected_key_version integer,
  _approval_reference text default null
)
  returns table(allowed boolean, reason text, remaining_usd numeric, usage_id bigint)
  language plpgsql
  volatile
  security definer
  set search_path to 'public'
as $function$
declare
  _agent public.agents;
  _spent numeric;
  _approval public.approval_requests;
  _usage_id bigint;
  _existing public.agent_usage;
  _amount numeric;
  _period timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
begin
  if _reference is null or length(_reference) < 1 or length(_reference) > 200 then
    return query select false, 'invalid_reference', 0::numeric, null::bigint; return;
  end if;
  if _amount_usd is null or not (_amount_usd >= 0) or _amount_usd > 1000000 then
    return query select false, 'invalid_amount', 0::numeric, null::bigint; return;
  end if;
  _amount := round(_amount_usd, 2);
  if _amount <> _amount_usd then
    return query select false, 'amount_not_in_cents', 0::numeric, null::bigint; return;
  end if;

  select * into _agent from public.agents where public_id = _public_id for no key update;
  if not found then
    return query select false, 'unknown_agent', 0::numeric, null::bigint; return;
  end if;
  if _agent.current_key_version <> _expected_key_version then
    return query select false, 'key_version_conflict', 0::numeric, null::bigint; return;
  end if;
  if _agent.status <> 'valid' then
    return query select false, 'agent_frozen', 0::numeric, null::bigint; return;
  end if;
  if _agent.expires_at <= now() then
    return query select false, 'agent_expired', 0::numeric, null::bigint; return;
  end if;

  select coalesce(sum(case when kind = 'refund' then -amount_usd else amount_usd end), 0)
    into _spent from public.agent_usage
   where agent_id = _agent.id and kind in ('spend', 'refund') and created_at >= _period;
  _spent := greatest(_spent, 0);

  select * into _existing from public.agent_usage
   where agent_id = _agent.id and reference = _reference;
  if found then
    if _existing.kind = 'spend' and _existing.amount_usd = _amount then
      return query select true, 'already_recorded',
        greatest(_agent.monthly_spend_limit::numeric - _spent, 0), _existing.id;
    else
      return query select false, 'reference_reused',
        greatest(_agent.monthly_spend_limit::numeric - _spent, 0), null::bigint;
    end if;
    return;
  end if;

  if _spent + _amount > _agent.monthly_spend_limit::numeric then
    return query select false, 'over_monthly_limit',
      greatest(_agent.monthly_spend_limit::numeric - _spent, 0), null::bigint; return;
  end if;

  if _agent.approval_above is not null and _amount > _agent.approval_above::numeric then
    if _approval_reference is null then
      return query select false, 'owner_approval_required',
        greatest(_agent.monthly_spend_limit::numeric - _spent, 0), null::bigint; return;
    end if;

    select * into _approval from public.approval_requests
     where reference = _approval_reference and agent_id = _agent.id
     for no key update;
    if not found
       or _approval.mandate_version is distinct from _agent.current_mandate_version
       or (_approval.key_version is null
           and (public.agent_key_change_enabled() or _agent.current_key_version <> 1))
       or (_approval.key_version is not null and _approval.key_version <> _agent.current_key_version)
       or _approval.status <> 'approved'
       or _approval.consumed_at is not null
       or _approval.expires_at <= now()
       or _approval.amount_usd < _amount then
      return query select false, 'approval_invalid',
        greatest(_agent.monthly_spend_limit::numeric - _spent, 0), null::bigint; return;
    end if;
    update public.approval_requests set consumed_at = now() where id = _approval.id;
  end if;

  begin
    insert into public.agent_usage (
      agent_id, kind, amount_usd, detail, reference, approval_id,
      mandate_version, key_version
    ) values (
      _agent.id, 'spend', _amount, left(coalesce(_detail, ''), 300),
      _reference, _approval.id, _agent.current_mandate_version, _agent.current_key_version
    ) returning id into _usage_id;
  exception when unique_violation then
    return query select false, 'reference_reused',
      greatest(_agent.monthly_spend_limit::numeric - _spent, 0), null::bigint; return;
  end;

  insert into public.agent_events (agent_id, kind, detail, signer, key_version)
  values (
    _agent.id, 'spend',
    'Mandate v' || _agent.current_mandate_version || ' · key v' || _agent.current_key_version ||
      ': spent $' || to_char(_amount, 'FM999999990.00') ||
      case when coalesce(_detail, '') = '' then '' else ' — ' || left(_detail, 180) end,
    'infinity', _agent.current_key_version
  );

  return query select true, 'recorded',
    greatest(_agent.monthly_spend_limit::numeric - (_spent + _amount), 0), _usage_id;
exception
  when serialization_failure or deadlock_detected then
    return query select false, 'contention_retry', 0::numeric, null::bigint;
end
$function$;

revoke execute on function public.reserve_spend_v2(text, numeric, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.reserve_spend_v2(text, numeric, text, text, integer, text)
  to service_role;

-- Owner decisions become key-aware without breaking pre-activation legacy rows.
create or replace function public.decide_approval(_reference text, _approve boolean)
  returns table(status text)
  language plpgsql
  volatile
  security definer
  set search_path to 'public'
as $function$
declare
  _row public.approval_requests;
  _agent public.agents;
  _key_changes_enabled boolean := public.agent_key_change_enabled();
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;

  select * into _row from public.approval_requests r where r.reference = _reference;
  if not found then
    raise exception 'approval_not_pending_or_not_yours' using errcode = 'no_data_found';
  end if;
  select * into _agent from public.agents a
   where a.id = _row.agent_id and a.owner_id = auth.uid()
   for no key update;
  if not found then
    raise exception 'approval_not_pending_or_not_yours' using errcode = 'no_data_found';
  end if;
  if _row.mandate_version is null
     or _row.mandate_version <> _agent.current_mandate_version
     or (_row.key_version is null
         and (_key_changes_enabled or _agent.current_key_version <> 1))
     or (_row.key_version is not null and _row.key_version <> _agent.current_key_version) then
    raise exception 'approval_superseded' using errcode = 'invalid_parameter_value';
  end if;

  update public.approval_requests r
     set status = case when _approve then 'approved' else 'denied' end,
         decided_at = now()
   where r.id = _row.id and r.status = 'pending' and r.expires_at > now()
  returning r.* into _row;
  if not found then
    raise exception 'approval_not_pending_or_not_yours' using errcode = 'no_data_found';
  end if;

  insert into public.agent_events (agent_id, kind, detail, signer, key_version)
  values (
    _row.agent_id,
    case when _approve then 'approval_granted' else 'approval_denied' end,
    'Mandate v' || _row.mandate_version ||
      case when _row.key_version is null then ' · legacy key' else ' · key v' || _row.key_version end ||
      ': ' || left(_row.action, 240),
    'owner', _row.key_version
  );
  return query select _row.status;
end
$function$;

revoke execute on function public.decide_approval(text, boolean) from public, anon;
grant execute on function public.decide_approval(text, boolean) to authenticated;

-- =================================================== 9. current public view
-- Existing columns retain their order; key lifecycle fields are appended.
drop function if exists public.verify_agent(text);
create function public.verify_agent(_public_id text)
  returns table(
    public_id text, name text, source text, status text,
    owner_name text, owner_verified boolean,
    permissions text[], monthly_spend_limit integer, approval_above integer,
    public_key text, created_at timestamptz, expires_at timestamptz, last_hash text,
    owner_attestation_issuer text, owner_attestation_method text,
    owner_attestation_assurance text, owner_attestation_verified_at timestamptz,
    owner_attestation_expires_at timestamptz,
    mandate_version integer, mandate_issued_at timestamptz,
    credential_revision text,
    key_version integer, key_activated_at timestamptz, key_fingerprint text,
    key_authorization_method text, key_continuity_proven boolean,
    key_possession_proven boolean, credential_state_issued_at timestamptz,
    key_recovery_hold_version integer
  )
  language sql
  stable
  security definer
  set search_path to 'public', 'extensions'
as $function$
  select
    a.public_id, a.name, a.source, a.status,
    p.display_name,
    (att.assurance is not null),
    m.permissions, m.monthly_spend_limit, m.approval_above,
    k.public_key, a.created_at, m.expires_at,
    (select e.hash from public.agent_events e where e.agent_id = a.id order by e.id desc limit 1),
    att.issuer, att.method, att.assurance, att.verified_at, att.expires_at,
    m.version, m.issued_at,
    encode(extensions.digest(
      jsonb_build_object(
        'agent_id', a.public_id,
        'name', a.name,
        'source', a.source,
        'key_version', k.version,
        'public_key', k.public_key,
        'key_fingerprint', k.fingerprint,
        'key_activated_at_us', (extract(epoch from k.activated_at) * 1000000)::bigint,
        'key_authorization_method', k.authorization_method,
        'key_continuity_proven', k.continuity_proven,
        'key_possession_proven', k.possession_proven,
        'key_recovery_hold_version', a.key_recovery_hold_version,
        'owner_name', p.display_name,
        'attestation_issuer', att.issuer,
        'attestation_method', att.method,
        'attestation_assurance', att.assurance,
        'attestation_verified_at', (extract(epoch from att.verified_at) * 1000000)::bigint,
        'attestation_expires_at', (extract(epoch from att.expires_at) * 1000000)::bigint,
        'mandate_version', m.version,
        'mandate_issued_at', (extract(epoch from m.issued_at) * 1000000)::bigint,
        'permissions', m.permissions,
        'monthly_spend_limit', m.monthly_spend_limit,
        'approval_above', m.approval_above,
        'expires_at', (extract(epoch from m.expires_at) * 1000000)::bigint
      )::text,
      'sha256'
    ), 'hex'),
    k.version, k.activated_at, k.fingerprint, k.authorization_method,
    k.continuity_proven, k.possession_proven,
    greatest(m.issued_at, k.activated_at, coalesce(att.verified_at, m.issued_at)),
    a.key_recovery_hold_version
  from public.agents a
  join public.agent_mandate_versions m
    on m.agent_id = a.id and m.version = a.current_mandate_version
  join public.agent_key_versions k
    on k.agent_id = a.id and k.version = a.current_key_version
  left join public.profiles p on p.id = a.owner_id
  left join lateral public.current_owner_attestation(a.owner_id) att on true
  where a.public_id = _public_id
$function$;

revoke execute on function public.verify_agent(text) from public;
grant execute on function public.verify_agent(text) to anon, authenticated, service_role;
comment on function public.verify_agent(text) is
  'Public current agent projection with independent mandate/key versions and deterministic signed-claim revision. Direct table reads remain denied.';

-- ====================================================== 10. final assertions
do $function$
begin
  if (select count(*) from public.agents) <> (
    select count(*) from public.agent_key_versions where version = 1
  )
     or exists (
       select 1 from public.agents a
       left join public.agent_key_versions k
         on k.agent_id = a.id and k.version = a.current_key_version
       where a.current_key_version <> 1
          or a.key_recovery_hold_version is not null
          or k.agent_id is null
          or k.public_key <> a.public_key
          or k.fingerprint <> public.agent_public_key_fingerprint(a.public_key)
     )
     or exists (select 1 from public.agent_key_versions where version > 1) then
    raise exception 'agent_key_v1_backfill_contract_failed'
      using errcode = 'integrity_constraint_violation';
  end if;

  if exists (
    select 1 from public.product_capabilities
     where capability in ('agent_key_rotation', 'agent_key_recovery')
       and (enabled or enabled_at is not null)
  ) or (select count(*) from public.product_capabilities
         where capability in ('agent_key_rotation', 'agent_key_recovery')) <> 2 then
    raise exception 'agent_key_capability_must_start_disabled'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if not exists (
    select 1 from pg_class where oid = 'public.agent_key_versions'::regclass and relrowsecurity
  )
     or not exists (
       select 1 from pg_class where oid = 'public.agent_key_change_requests'::regclass and relrowsecurity
     )
     or has_table_privilege('anon', 'public.agent_key_versions', 'SELECT')
     or has_table_privilege('anon', 'public.agent_key_change_requests', 'SELECT')
     or has_table_privilege('authenticated', 'public.agent_key_change_requests', 'SELECT') then
    raise exception 'agent_key_rls_contract_failed' using errcode = 'insufficient_privilege';
  end if;

  if has_function_privilege(
       'anon',
       'public.change_agent_key(uuid,uuid,integer,text,text,text,uuid,text,text,text,timestamp with time zone,text,text,text,text,timestamp with time zone)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.change_agent_key(uuid,uuid,integer,text,text,text,uuid,text,text,text,timestamp with time zone,text,text,text,text,timestamp with time zone)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.change_agent_key(uuid,uuid,integer,text,text,text,uuid,text,text,text,timestamp with time zone,text,text,text,text,timestamp with time zone)',
       'EXECUTE'
     )
     or has_function_privilege('anon', 'public.record_signed_action_v2(text,text,text,text,text,integer,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.record_signed_action_v2(text,text,text,text,text,integer,text)', 'EXECUTE') then
    raise exception 'agent_key_function_grant_contract_failed' using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1
    from (
      values
        ('public.agents'::regclass, 'agents_create_initial_key', 'public.create_initial_agent_key_version()'::regprocedure),
        ('public.agents'::regclass, 'agents_guard_identity_and_mandate', 'public.guard_agent_identity_and_mandate()'::regprocedure),
        ('public.agent_key_versions'::regclass, 'agent_key_versions_immutable', 'public.reject_agent_key_history_mutation()'::regprocedure),
        ('public.agent_key_versions'::regclass, 'agent_key_versions_no_truncate', 'public.reject_agent_key_history_mutation()'::regprocedure),
        ('public.agent_key_change_requests'::regclass, 'agent_key_requests_immutable', 'public.reject_agent_key_history_mutation()'::regprocedure),
        ('public.agent_key_change_requests'::regclass, 'agent_key_requests_no_truncate', 'public.reject_agent_key_history_mutation()'::regprocedure),
        ('public.agent_events'::regclass, 'agent_events_chain', 'public.chain_event()'::regprocedure),
        ('public.agent_events'::regclass, 'agent_events_immutable', 'public.reject_agent_event_mutation()'::regprocedure),
        ('public.agent_events'::regclass, 'agent_events_no_truncate', 'public.reject_agent_events_truncate()'::regprocedure),
        ('public.agent_events'::regclass, 'agent_events_00_require_key_evidence', 'public.require_agent_event_key_evidence()'::regprocedure),
        ('public.agent_challenges'::regclass, 'agent_challenges_require_key_version', 'public.require_challenge_key_version()'::regprocedure),
        ('public.approval_requests'::regclass, 'approval_requests_require_key_version', 'public.require_evidence_key_version()'::regprocedure),
        ('public.agent_usage'::regclass, 'agent_usage_require_key_version', 'public.require_evidence_key_version()'::regprocedure)
    ) required(relation_id, trigger_name, function_id)
    where not exists (
      select 1 from pg_trigger t
       where t.tgrelid = required.relation_id
         and t.tgname = required.trigger_name
         and t.tgfoid = required.function_id
         and t.tgenabled = 'O'
         and not t.tgisinternal
    )
  ) then
    raise exception 'agent_key_trigger_contract_failed'
      using errcode = 'integrity_constraint_violation';
  end if;
end
$function$;
