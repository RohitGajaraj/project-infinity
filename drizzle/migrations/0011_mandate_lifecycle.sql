-- Immutable mandate lifecycle and verifier-visible credential versions.
--
-- Stable identity stays on agents: id, public_id, owner_id and public_key never
-- change here. Every mandate change appends N+1, atomically advances the current
-- pointer, and keeps the old signed credential as historical evidence whose live
-- status is superseded. Spend remains agent-global across versions.
--
-- Existing agents are backfilled as v1 from their current projection. History
-- before this cutover cannot be reconstructed from generic `limits` events, so
-- this migration does not pretend otherwise.
--
-- Safe to apply once. All schema, grants and RLS changes are in this file.

-- ============================================================= 1. version store
alter table public.agents
  add column if not exists current_mandate_version integer not null default 1,
  add column if not exists issuance_request_id uuid;

create unique index if not exists agents_owner_issuance_request_key
  on public.agents (owner_id, issuance_request_id)
  where issuance_request_id is not null;

create table if not exists public.agent_mandate_versions (
  agent_id uuid not null references public.agents(id) on delete restrict,
  version integer not null,
  permissions text[] not null,
  monthly_spend_limit integer not null,
  approval_above integer,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  issued_by uuid not null,
  change_reason text not null,
  request_id uuid not null,

  primary key (agent_id, version),
  constraint agent_mandate_versions_version_check check (version >= 1),
  constraint agent_mandate_versions_permissions_check
    check (version = 1 or array_position(permissions, '') is null),
  constraint agent_mandate_versions_limit_check
    check (version = 1 or monthly_spend_limit between 0 and 1000000),
  constraint agent_mandate_versions_approval_check
    check (version = 1 or approval_above is null or approval_above between 0 and monthly_spend_limit),
  constraint agent_mandate_versions_expiry_check check (version = 1 or expires_at > issued_at),
  constraint agent_mandate_versions_reason_check check (length(change_reason) between 3 and 240),
  constraint agent_mandate_versions_request_key unique (agent_id, request_id)
);

insert into public.agent_mandate_versions (
  agent_id, version, permissions, monthly_spend_limit, approval_above,
  issued_at, expires_at, issued_by, change_reason, request_id
)
select a.id, 1, a.permissions, a.monthly_spend_limit, a.approval_above,
       a.created_at, a.expires_at, a.owner_id,
       'Imported current mandate at versioning cutover', a.id
  from public.agents a
on conflict (agent_id, version) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'agents_current_mandate_fk'
  ) then
    alter table public.agents
      add constraint agents_current_mandate_fk
      foreign key (id, current_mandate_version)
      references public.agent_mandate_versions(agent_id, version)
      deferrable initially deferred;
  end if;
end
$$;

create index if not exists agent_mandate_versions_agent_issued_idx
  on public.agent_mandate_versions (agent_id, issued_at desc);

alter table public.agent_mandate_versions enable row level security;
revoke all on public.agent_mandate_versions from anon, authenticated;
grant select on public.agent_mandate_versions to authenticated;

drop policy if exists "owner reads mandate versions" on public.agent_mandate_versions;
create policy "owner reads mandate versions"
  on public.agent_mandate_versions for select to authenticated
  using (exists (
    select 1 from public.agents a
     where a.id = agent_mandate_versions.agent_id and a.owner_id = auth.uid()
  ));

create or replace function public.reject_mandate_version_mutation()
  returns trigger
  language plpgsql
  set search_path to 'public'
as $function$
begin
  raise exception 'mandate_versions_are_append_only' using errcode = 'insufficient_privilege';
end
$function$;

drop trigger if exists mandate_versions_immutable on public.agent_mandate_versions;
create trigger mandate_versions_immutable
  before update or delete on public.agent_mandate_versions
  for each row execute function public.reject_mandate_version_mutation();
drop trigger if exists mandate_versions_no_truncate on public.agent_mandate_versions;
create trigger mandate_versions_no_truncate
  before truncate on public.agent_mandate_versions
  for each statement execute function public.reject_mandate_version_mutation();

comment on table public.agent_mandate_versions is
  'Append-only owner mandate history, guarded against row mutation and TRUNCATE. The database owner can still bypass database enforcement. Rollback is a new version.';

create or replace function public.mandate_snapshot_hash(_agent_id uuid, _version integer)
  returns text
  language sql
  stable
  security definer
  set search_path to 'public', 'extensions'
as $function$
  select encode(extensions.digest(
    jsonb_build_object(
      'agent_id', m.agent_id,
      'version', m.version,
      'permissions', m.permissions,
      'monthly_spend_limit', m.monthly_spend_limit,
      'approval_above', m.approval_above,
      'issued_at_us', (extract(epoch from m.issued_at) * 1000000)::bigint,
      'expires_at_us', (extract(epoch from m.expires_at) * 1000000)::bigint,
      'issued_by', m.issued_by,
      'change_reason', m.change_reason,
      'request_id', m.request_id
    )::text,
    'sha256'
  ), 'hex')
  from public.agent_mandate_versions m
  where m.agent_id = _agent_id and m.version = _version
$function$;
revoke execute on function public.mandate_snapshot_hash(uuid, integer) from public;

-- Backfilled agents did not pass through the future insert trigger, so anchor each
-- imported v1 snapshot explicitly in the existing per-agent hash chain.
insert into public.agent_events (agent_id, kind, detail, signer)
select m.agent_id,
       'mandate_issued',
       'Mandate v1 snapshot sha256 ' || public.mandate_snapshot_hash(m.agent_id, 1) ||
         ' · imported at versioning cutover',
       'owner'
  from public.agent_mandate_versions m
 where m.version = 1
   and m.change_reason = 'Imported current mandate at versioning cutover'
   and not exists (
     select 1 from public.agent_events e
      where e.agent_id = m.agent_id
        and e.kind = 'mandate_issued'
        and e.detail like 'Mandate v1 snapshot sha256 %'
   );

-- Every accepted reissue request, including a no-op, gets a durable result so a
-- retry after later versions cannot change meaning.
create table if not exists public.agent_mandate_requests (
  agent_id uuid not null references public.agents(id) on delete restrict,
  request_id uuid not null,
  expected_version integer not null,
  permissions text[] not null,
  monthly_spend_limit integer not null,
  approval_above integer,
  expires_at timestamptz not null,
  change_reason text not null,
  result_version integer not null,
  result text not null,
  created_at timestamptz not null default now(),
  primary key (agent_id, request_id),
  constraint agent_mandate_requests_result_check check (result in ('issued', 'no_change')),
  constraint agent_mandate_requests_result_fk
    foreign key (agent_id, result_version)
    references public.agent_mandate_versions(agent_id, version) on delete restrict
);

alter table public.agent_mandate_requests enable row level security;
revoke all on public.agent_mandate_requests from anon, authenticated;
drop trigger if exists mandate_requests_immutable on public.agent_mandate_requests;
create trigger mandate_requests_immutable
  before update or delete on public.agent_mandate_requests
  for each row execute function public.reject_mandate_version_mutation();
drop trigger if exists mandate_requests_no_truncate on public.agent_mandate_requests;
create trigger mandate_requests_no_truncate
  before truncate on public.agent_mandate_requests
  for each statement execute function public.reject_mandate_version_mutation();
comment on table public.agent_mandate_requests is
  'Internal append-only idempotency ledger for issued/no-op reissues, including a TRUNCATE guard. No client access; database owner remains trusted.';

-- Expansion migration ships disabled. After the version-aware trust routes are
-- published and probed, a separate activation migration flips this capability.
-- This keeps migration-first deployment and pre-activation rollback fail-closed.
create table if not exists public.product_capabilities (
  capability text primary key,
  enabled boolean not null default false,
  enabled_at timestamptz,
  constraint product_capabilities_enabled_at_check
    check ((enabled and enabled_at is not null) or (not enabled and enabled_at is null))
);
insert into public.product_capabilities (capability, enabled, enabled_at)
values ('mandate_reissue', false, null)
on conflict (capability) do nothing;
alter table public.product_capabilities enable row level security;
revoke all on public.product_capabilities from anon, authenticated;
comment on table public.product_capabilities is
  'Internal rollout gates. No API-role access; changed only by reviewed migrations.';

-- ============================================================ 2. write boundary
-- Expansion-safe cutover: the currently published UI still inserts agents and
-- updates status directly. Keep those grants temporarily, but enforce in triggers
-- that direct inserts are normalized into v1 and direct updates can change only
-- status. The new RPC UI can be published before a later contract migration
-- removes the compatibility grants and policies.
create or replace function public.guard_agent_identity_and_mandate()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public', 'extensions'
as $function$
begin
  if TG_OP = 'INSERT' then
    if auth.uid() is not null then
      NEW.public_id := public.gen_agent_public_id();
      NEW.status := 'valid';
      NEW.created_at := now();
    end if;
    NEW.current_mandate_version := 1;
    NEW.issuance_request_id := coalesce(NEW.issuance_request_id, extensions.gen_random_uuid());

    if length(btrim(coalesce(NEW.name, ''))) not between 1 and 60
       or length(btrim(coalesce(NEW.source, ''))) not between 1 and 80
       or coalesce(NEW.public_key, '') !~ '^ed25519:[A-Za-z0-9+/]{43}=?$'
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
     or NEW.public_key is distinct from OLD.public_key
     or NEW.created_at is distinct from OLD.created_at
     or NEW.issuance_request_id is distinct from OLD.issuance_request_id then
    raise exception 'agent_identity_is_immutable' using errcode = 'insufficient_privilege';
  end if;

  if NEW.permissions is distinct from OLD.permissions
     or NEW.monthly_spend_limit is distinct from OLD.monthly_spend_limit
     or NEW.approval_above is distinct from OLD.approval_above
     or NEW.expires_at is distinct from OLD.expires_at
     or NEW.current_mandate_version is distinct from OLD.current_mandate_version then
    if current_setting('infinity.mandate_reissue', true) is distinct from '1' then
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

drop trigger if exists agents_guard_identity_and_mandate on public.agents;
create trigger agents_guard_identity_and_mandate
  before insert or update on public.agents
  for each row execute function public.guard_agent_identity_and_mandate();

create or replace function public.create_initial_mandate_version()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  insert into public.agent_mandate_versions (
    agent_id, version, permissions, monthly_spend_limit, approval_above,
    issued_at, expires_at, issued_by, change_reason, request_id
  )
  values (
    NEW.id, 1, NEW.permissions, NEW.monthly_spend_limit, NEW.approval_above,
    NEW.created_at, NEW.expires_at, NEW.owner_id, 'Initial mandate', NEW.issuance_request_id
  );
  insert into public.agent_events (agent_id, kind, detail, signer)
  values (
    NEW.id,
    'mandate_issued',
    'Mandate v1 snapshot sha256 ' || public.mandate_snapshot_hash(NEW.id, 1),
    'owner'
  );
  return NEW;
end
$function$;

drop trigger if exists agents_create_initial_mandate on public.agents;
create trigger agents_create_initial_mandate
  after insert on public.agents
  for each row execute function public.create_initial_mandate_version();

-- Keep automatic event logging only for initial issuance and the orthogonal
-- freeze switch. Reissue writes its own versioned event below.
create or replace function public.log_agent_change()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if TG_OP = 'INSERT' then
    insert into public.agent_events(agent_id, kind, detail)
    values (NEW.id, 'issued', 'Agent ID ' || NEW.public_id || ' issued, public key registered');
  elsif NEW.status is distinct from OLD.status then
    insert into public.agent_events(agent_id, kind, detail, signer)
    values (
      NEW.id,
      case when NEW.status = 'frozen' then 'frozen' else 'unfrozen' end,
      'Owner set status to ' || NEW.status,
      'owner'
    );
  end if;
  return NEW;
end
$function$;

create or replace function public.issue_agent(
  _name text,
  _source text,
  _public_key text,
  _permissions text[],
  _monthly_spend_limit integer,
  _approval_above integer,
  _expires_at timestamptz,
  _request_id uuid
)
  returns table(id uuid, public_id text, mandate_version integer, result text)
  language plpgsql
  volatile
  security definer
  set search_path to 'public'
as $function$
declare
  _owner_id uuid := auth.uid();
  _agent public.agents;
  _initial public.agent_mandate_versions;
  _normalized_permissions text[];
begin
  if _owner_id is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if _request_id is null then
    raise exception 'request_id_required' using errcode = 'invalid_parameter_value';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(_owner_id::text || ':' || _request_id::text, 0));

  if exists (
    select 1 from unnest(coalesce(_permissions, '{}'::text[])) permission
     where permission is null or btrim(permission) = '' or length(btrim(permission)) > 80
  ) then
    raise exception 'invalid_permission' using errcode = 'invalid_parameter_value';
  end if;

  select array_agg(distinct btrim(permission) order by btrim(permission))
    into _normalized_permissions
    from unnest(coalesce(_permissions, '{}'::text[])) permission
   where btrim(permission) <> '' and length(btrim(permission)) <= 80;

  if length(btrim(coalesce(_name, ''))) not between 1 and 60
     or length(btrim(coalesce(_source, ''))) not between 1 and 80
     or coalesce(_public_key, '') !~ '^ed25519:[A-Za-z0-9+/]{43}=?$'
     or cardinality(coalesce(_normalized_permissions, '{}'::text[])) = 0
     or _monthly_spend_limit is null
     or _monthly_spend_limit not between 0 and 1000000
     or (_approval_above is not null and _approval_above not between 0 and _monthly_spend_limit)
     or _expires_at is null
     or _expires_at <= now() then
    raise exception 'invalid_agent_mandate' using errcode = 'invalid_parameter_value';
  end if;

  select * into _agent from public.agents a
   where a.owner_id = _owner_id and a.issuance_request_id = _request_id;
  if found then
    select * into _initial from public.agent_mandate_versions m
     where m.agent_id = _agent.id and m.version = 1;
    if _agent.name is distinct from btrim(_name)
       or _agent.source is distinct from btrim(_source)
       or _agent.public_key is distinct from _public_key
       or _initial.permissions is distinct from _normalized_permissions
       or _initial.monthly_spend_limit is distinct from _monthly_spend_limit
       or _initial.approval_above is distinct from _approval_above
       or _initial.expires_at is distinct from _expires_at then
      raise exception 'idempotency_conflict' using errcode = 'unique_violation';
    end if;
    return query select _agent.id, _agent.public_id, _agent.current_mandate_version, 'already_issued'::text;
    return;
  end if;

  insert into public.agents (
    owner_id, name, source, status, public_key, permissions,
    monthly_spend_limit, approval_above, expires_at,
    current_mandate_version, issuance_request_id
  )
  values (
    _owner_id, btrim(_name), btrim(_source), 'valid', _public_key, _normalized_permissions,
    _monthly_spend_limit, _approval_above, _expires_at, 1, _request_id
  )
  returning * into _agent;

  -- agents_create_initial_mandate appends v1 in the same transaction for both
  -- this RPC and the temporarily compatible direct-insert UI.
  return query select _agent.id, _agent.public_id, 1, 'issued'::text;
end
$function$;

revoke execute on function public.issue_agent(text, text, text, text[], integer, integer, timestamptz, uuid) from public;
revoke execute on function public.issue_agent(text, text, text, text[], integer, integer, timestamptz, uuid) from anon;
grant execute on function public.issue_agent(text, text, text, text[], integer, integer, timestamptz, uuid) to authenticated;

create or replace function public.reissue_agent_mandate(
  _owner_id uuid,
  _agent_id uuid,
  _expected_version integer,
  _permissions text[],
  _monthly_spend_limit integer,
  _approval_above integer,
  _expires_at timestamptz,
  _request_id uuid,
  _change_reason text
)
  returns table(mandate_version integer, issued_at timestamptz, result text)
  language plpgsql
  volatile
  security definer
  set search_path to 'public'
as $function$
declare
  _agent public.agents;
  _request public.agent_mandate_requests;
  _normalized_permissions text[];
  _next integer;
  _issued_at timestamptz := now();
begin
  if _owner_id is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.product_capabilities c
     where c.capability = 'mandate_reissue' and c.enabled
  ) then
    raise exception 'mandate_reissue_not_enabled' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if _request_id is null
     or _expected_version is null
     or length(btrim(coalesce(_change_reason, ''))) not between 3 and 240 then
    raise exception 'invalid_reissue_request' using errcode = 'invalid_parameter_value';
  end if;

  select * into _agent from public.agents a
   where a.id = _agent_id and a.owner_id = _owner_id
   for no key update;
  if not found then
    raise exception 'agent_not_found_or_not_yours' using errcode = 'no_data_found';
  end if;
  if exists (
    select 1 from unnest(coalesce(_permissions, '{}'::text[])) permission
     where permission is null or btrim(permission) = '' or length(btrim(permission)) > 80
  ) then
    raise exception 'invalid_permission' using errcode = 'invalid_parameter_value';
  end if;

  select array_agg(distinct btrim(permission) order by btrim(permission))
    into _normalized_permissions
    from unnest(coalesce(_permissions, '{}'::text[])) permission
   where btrim(permission) <> '' and length(btrim(permission)) <= 80;

  select * into _request from public.agent_mandate_requests r
   where r.agent_id = _agent_id and r.request_id = _request_id;
  if found then
    if _request.expected_version is distinct from _expected_version
       or _request.permissions is distinct from _normalized_permissions
       or _request.monthly_spend_limit is distinct from _monthly_spend_limit
       or _request.approval_above is distinct from _approval_above
       or _request.expires_at is distinct from _expires_at
       or _request.change_reason is distinct from btrim(_change_reason) then
      raise exception 'idempotency_conflict' using errcode = 'unique_violation';
    end if;
    select m.issued_at into _issued_at from public.agent_mandate_versions m
     where m.agent_id = _agent_id and m.version = _request.result_version;
    return query select _request.result_version, _issued_at,
                        case when _request.result = 'issued' then 'already_issued' else 'no_change' end;
    return;
  end if;

  if _agent.current_mandate_version <> _expected_version then
    raise exception 'mandate_version_conflict' using errcode = 'serialization_failure';
  end if;

  if cardinality(coalesce(_normalized_permissions, '{}'::text[])) = 0
     or _monthly_spend_limit is null
     or _monthly_spend_limit not between 0 and 1000000
     or (_approval_above is not null and _approval_above not between 0 and _monthly_spend_limit)
     or _expires_at is null
     or _expires_at <= _issued_at then
    raise exception 'invalid_agent_mandate' using errcode = 'invalid_parameter_value';
  end if;

  if _normalized_permissions = _agent.permissions
     and _monthly_spend_limit = _agent.monthly_spend_limit
     and _approval_above is not distinct from _agent.approval_above
     and _expires_at = _agent.expires_at then
    select m.issued_at into _issued_at from public.agent_mandate_versions m
     where m.agent_id = _agent.id and m.version = _agent.current_mandate_version;
    insert into public.agent_mandate_requests (
      agent_id, request_id, expected_version, permissions, monthly_spend_limit,
      approval_above, expires_at, change_reason, result_version, result
    ) values (
      _agent.id, _request_id, _expected_version, _normalized_permissions,
      _monthly_spend_limit, _approval_above, _expires_at, btrim(_change_reason),
      _agent.current_mandate_version, 'no_change'
    );
    return query select _agent.current_mandate_version, _issued_at, 'no_change'::text;
    return;
  end if;

  _next := _agent.current_mandate_version + 1;
  insert into public.agent_mandate_versions (
    agent_id, version, permissions, monthly_spend_limit, approval_above,
    issued_at, expires_at, issued_by, change_reason, request_id
  )
  values (
    _agent.id, _next, _normalized_permissions, _monthly_spend_limit, _approval_above,
    _issued_at, _expires_at, _owner_id, btrim(_change_reason), _request_id
  );

  insert into public.agent_mandate_requests (
    agent_id, request_id, expected_version, permissions, monthly_spend_limit,
    approval_above, expires_at, change_reason, result_version, result
  ) values (
    _agent.id, _request_id, _expected_version, _normalized_permissions,
    _monthly_spend_limit, _approval_above, _expires_at, btrim(_change_reason),
    _next, 'issued'
  );

  perform set_config('infinity.mandate_reissue', '1', true);
  update public.agents a
     set permissions = _normalized_permissions,
         monthly_spend_limit = _monthly_spend_limit,
         approval_above = _approval_above,
         expires_at = _expires_at,
         current_mandate_version = _next
   where a.id = _agent.id;

  insert into public.agent_events (agent_id, kind, detail, signer)
  values (
    _agent.id,
    'mandate_reissued',
    'Mandate v' || _next || ' snapshot sha256 ' ||
      public.mandate_snapshot_hash(_agent.id, _next) ||
      ' · reason: ' || left(btrim(_change_reason), 160),
    'owner'
  );

  return query select _next, _issued_at, 'issued'::text;
end
$function$;

revoke execute on function public.reissue_agent_mandate(uuid, uuid, integer, text[], integer, integer, timestamptz, uuid, text) from public;
revoke execute on function public.reissue_agent_mandate(uuid, uuid, integer, text[], integer, integer, timestamptz, uuid, text) from anon;
revoke execute on function public.reissue_agent_mandate(uuid, uuid, integer, text[], integer, integer, timestamptz, uuid, text) from authenticated;
grant execute on function public.reissue_agent_mandate(uuid, uuid, integer, text[], integer, integer, timestamptz, uuid, text) to service_role;

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

  update public.agents set status = _new_status where id = _agent_id;
  return _new_status;
end
$function$;

revoke execute on function public.set_agent_status(uuid, text, text) from public;
revoke execute on function public.set_agent_status(uuid, text, text) from anon;
grant execute on function public.set_agent_status(uuid, text, text) to authenticated;

-- ============================================== 3. approval/usage version links
alter table public.agent_usage add column if not exists mandate_version integer;
alter table public.approval_requests add column if not exists mandate_version integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agent_usage_mandate_fk') then
    alter table public.agent_usage
      add constraint agent_usage_mandate_fk
      foreign key (agent_id, mandate_version)
      references public.agent_mandate_versions(agent_id, version) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'approval_requests_mandate_fk') then
    alter table public.approval_requests
      add constraint approval_requests_mandate_fk
      foreign key (agent_id, mandate_version)
      references public.agent_mandate_versions(agent_id, version) on delete restrict;
  end if;
end
$$;

create or replace function public.require_new_evidence_mandate_version()
  returns trigger
  language plpgsql
  set search_path to 'public'
as $function$
begin
  if NEW.mandate_version is null then
    raise exception 'mandate_version_required' using errcode = 'not_null_violation';
  end if;
  return NEW;
end
$function$;

drop trigger if exists agent_usage_requires_mandate_version on public.agent_usage;
create trigger agent_usage_requires_mandate_version
  before insert on public.agent_usage
  for each row execute function public.require_new_evidence_mandate_version();

drop trigger if exists approval_requests_requires_mandate_version on public.approval_requests;
create trigger approval_requests_requires_mandate_version
  before insert on public.approval_requests
  for each row execute function public.require_new_evidence_mandate_version();

create or replace function public.create_approval_request(
  _public_id text,
  _action text,
  _amount_usd numeric
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

  _ref := 'apr_' || encode(extensions.gen_random_bytes(16), 'hex');
  insert into public.approval_requests (agent_id, action, amount_usd, reference, mandate_version)
  values (_agent.id, _action, coalesce(_amount_usd, 0), _ref, _agent.current_mandate_version);

  insert into public.agent_events (agent_id, kind, detail)
  values (
    _agent.id,
    'approval_requested',
    'Mandate v' || _agent.current_mandate_version || ': ' || left(_action, 250)
  );

  return query select _ref, 'pending'::text, (now() + interval '24 hours')::timestamptz;
end
$function$;

revoke execute on function public.create_approval_request(text, text, numeric) from public;
revoke execute on function public.create_approval_request(text, text, numeric) from anon;
revoke execute on function public.create_approval_request(text, text, numeric) from authenticated;
grant execute on function public.create_approval_request(text, text, numeric) to service_role;

drop function if exists public.approval_state(text, text);
create function public.approval_state(_public_id text, _reference text)
  returns table(
    status text,
    amount_usd numeric,
    action text,
    expires_at timestamptz,
    consumed boolean,
    mandate_version integer,
    current_mandate_version integer
  )
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  select
    case
      when r.mandate_version is null or r.mandate_version <> a.current_mandate_version then 'superseded'
      when r.status = 'pending' and r.expires_at <= now() then 'expired'
      else r.status
    end,
    r.amount_usd,
    r.action,
    r.expires_at,
    (r.consumed_at is not null),
    r.mandate_version,
    a.current_mandate_version
  from public.approval_requests r
  join public.agents a on a.id = r.agent_id
  where r.reference = _reference and a.public_id = _public_id
$function$;

revoke execute on function public.approval_state(text, text) from public;
revoke execute on function public.approval_state(text, text) from anon;
revoke execute on function public.approval_state(text, text) from authenticated;
grant execute on function public.approval_state(text, text) to service_role;

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
     or _row.mandate_version <> _agent.current_mandate_version then
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

  insert into public.agent_events (agent_id, kind, detail, signer)
  values (
    _row.agent_id,
    case when _approve then 'approval_granted' else 'approval_denied' end,
    'Mandate v' || _row.mandate_version || ': ' || left(_row.action, 240),
    'owner'
  );
  return query select _row.status;
end
$function$;

revoke execute on function public.decide_approval(text, boolean) from public;
revoke execute on function public.decide_approval(text, boolean) from anon;
grant execute on function public.decide_approval(text, boolean) to authenticated;

-- ============================================================== 4. allowance
-- Return the active version with the agent-global monthly balance.
drop function if exists public.agent_allowance(text);
create function public.agent_allowance(_public_id text)
  returns table(
    monthly_limit_usd numeric,
    spent_this_month_usd numeric,
    remaining_usd numeric,
    approval_above_usd numeric,
    period_start timestamptz,
    usable boolean,
    status text,
    mandate_version integer
  )
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  with a as (
    select id, monthly_spend_limit, approval_above, status, expires_at, current_mandate_version
      from public.agents where public_id = _public_id
  ),
  spent as (
    select coalesce(sum(case when u.kind = 'refund' then -u.amount_usd else u.amount_usd end), 0) total
      from public.agent_usage u, a
     where u.agent_id = a.id
       and u.kind in ('spend', 'refund')
       and u.created_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'
  )
  select a.monthly_spend_limit::numeric,
         greatest(spent.total, 0),
         case when a.status = 'valid' and a.expires_at > now()
              then greatest(a.monthly_spend_limit::numeric - greatest(spent.total, 0), 0)
              else 0::numeric end,
         a.approval_above::numeric,
         date_trunc('month', now() at time zone 'UTC') at time zone 'UTC',
         (a.status = 'valid' and a.expires_at > now()),
         a.status,
         a.current_mandate_version
    from a, spent
$function$;

revoke execute on function public.agent_allowance(text) from public;
grant execute on function public.agent_allowance(text) to anon, authenticated, service_role;

-- ========================================================== 5. spend version tag
-- Same atomic cap semantics as 20260930000000, now tagging the active version and
-- refusing an approval created under any other version.
create or replace function public.reserve_spend(
  _public_id text,
  _amount_usd numeric,
  _detail text,
  _reference text,
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
    return query select false, 'invalid_reference', 0::numeric, null::bigint;
    return;
  end if;
  if _amount_usd is null or not (_amount_usd >= 0) or _amount_usd > 1000000 then
    return query select false, 'invalid_amount', 0::numeric, null::bigint;
    return;
  end if;
  _amount := round(_amount_usd, 2);
  if _amount <> _amount_usd then
    return query select false, 'amount_not_in_cents', 0::numeric, null::bigint;
    return;
  end if;

  select * into _agent from public.agents where public_id = _public_id for no key update;
  if not found then
    return query select false, 'unknown_agent', 0::numeric, null::bigint;
    return;
  end if;
  if _agent.status <> 'valid' then
    return query select false, 'agent_frozen', 0::numeric, null::bigint;
    return;
  end if;
  if _agent.expires_at <= now() then
    return query select false, 'agent_expired', 0::numeric, null::bigint;
    return;
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
                        greatest(_agent.monthly_spend_limit::numeric - _spent, 0), null::bigint;
    return;
  end if;

  if _agent.approval_above is not null and _amount > _agent.approval_above::numeric then
    if _approval_reference is null then
      return query select false, 'owner_approval_required',
                          greatest(_agent.monthly_spend_limit::numeric - _spent, 0), null::bigint;
      return;
    end if;

    select * into _approval from public.approval_requests
     where reference = _approval_reference and agent_id = _agent.id
     for no key update;
    if not found
       or _approval.mandate_version is distinct from _agent.current_mandate_version
       or _approval.status <> 'approved'
       or _approval.consumed_at is not null
       or _approval.expires_at <= now()
       or _approval.amount_usd < _amount then
      return query select false, 'approval_invalid',
                          greatest(_agent.monthly_spend_limit::numeric - _spent, 0), null::bigint;
      return;
    end if;
    update public.approval_requests set consumed_at = now() where id = _approval.id;
  end if;

  begin
    insert into public.agent_usage (
      agent_id, kind, amount_usd, detail, reference, approval_id, mandate_version
    )
    values (
      _agent.id, 'spend', _amount, left(coalesce(_detail, ''), 300),
      _reference, _approval.id, _agent.current_mandate_version
    )
    returning id into _usage_id;
  exception when unique_violation then
    return query select false, 'reference_reused',
                        greatest(_agent.monthly_spend_limit::numeric - _spent, 0), null::bigint;
    return;
  end;

  insert into public.agent_events (agent_id, kind, detail)
  values (
    _agent.id,
    'spend',
    'Mandate v' || _agent.current_mandate_version || ': spent $' ||
    to_char(_amount, 'FM999999990.00') ||
    case when coalesce(_detail, '') = '' then '' else ' — ' || left(_detail, 180) end
  );

  return query select true, 'recorded',
                      greatest(_agent.monthly_spend_limit::numeric - (_spent + _amount), 0), _usage_id;
exception
  when serialization_failure or deadlock_detected then
    return query select false, 'contention_retry', 0::numeric, null::bigint;
end
$function$;

revoke execute on function public.reserve_spend(text, numeric, text, text, text) from public;
revoke execute on function public.reserve_spend(text, numeric, text, text, text) from anon;
revoke execute on function public.reserve_spend(text, numeric, text, text, text) from authenticated;
grant execute on function public.reserve_spend(text, numeric, text, text, text) to service_role;

-- ======================================================== 6. public current view
-- Append version fields to the existing public SECURITY DEFINER projection.
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
    credential_revision text
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
    a.public_key, a.created_at, m.expires_at,
    (select e.hash from public.agent_events e where e.agent_id = a.id order by e.id desc limit 1),
    att.issuer, att.method, att.assurance, att.verified_at, att.expires_at,
    m.version, m.issued_at,
    encode(extensions.digest(
      jsonb_build_object(
        'agent_id', a.public_id,
        'name', a.name,
        'source', a.source,
        'public_key', a.public_key,
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
    ), 'hex')
  from public.agents a
  join public.agent_mandate_versions m
    on m.agent_id = a.id and m.version = a.current_mandate_version
  left join public.profiles p on p.id = a.owner_id
  left join lateral public.current_owner_attestation(a.owner_id) att on true
  where a.public_id = _public_id
$function$;

revoke execute on function public.verify_agent(text) from public;
grant execute on function public.verify_agent(text) to anon, authenticated, service_role;

comment on function public.verify_agent(text) is
  'Public current agent projection. Direct table reads remain denied; includes active mandate version and deterministic signed-claim revision.';
