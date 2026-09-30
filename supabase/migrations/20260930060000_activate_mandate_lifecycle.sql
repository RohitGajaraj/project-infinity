-- Activate immutable mandate reissue only after the expansion migration, version-aware
-- application, and production write probes have all passed. Evidence is recorded in
-- coordination/requests/20260930-1750-mandate-lifecycle-activation.md.
--
-- This migration is intentionally atomic: in-flight legacy writes drain first,
-- direct table writes are contracted, R9 is closed, and only then is reissue enabled.
-- The permanent lifecycle triggers remain in place because the RPC paths rely on them.

-- Drain any in-flight direct INSERT/PATCH before removing the compatibility surface.
lock table public.agents in share row exclusive mode;

-- Fail closed if the staged rollout was bypassed or already activated outside a
-- reviewed migration. No v2 may exist while the capability is disabled.
do $function$
begin
  if not exists (
    select 1
      from public.product_capabilities
     where capability = 'mandate_reissue'
       and enabled = false
       and enabled_at is null
  ) then
    raise exception 'mandate_reissue_activation_precondition_failed'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if exists (
    select 1 from public.agent_mandate_versions where version > 1
  ) then
    raise exception 'mandate_reissue_activation_found_unexpected_versions'
      using errcode = 'integrity_constraint_violation';
  end if;
end
$function$;

-- The published console now uses issue_agent and set_agent_status. Keep SELECT
-- for the owner console; remove every direct mutation privilege and policy.
revoke insert, update, delete on table public.agents from authenticated;
drop policy if exists "owner insert agents" on public.agents;
drop policy if exists "owner update agents" on public.agents;
drop policy if exists "owner delete agents" on public.agents;

-- Evaluate auth.uid() once while preserving the same owner-only history scope.
drop policy if exists "owner reads mandate versions" on public.agent_mandate_versions;
create policy "owner reads mandate versions"
  on public.agent_mandate_versions
  for select to authenticated
  using (
    exists (
      select 1
        from public.agents a
       where a.id = agent_mandate_versions.agent_id
         and a.owner_id = (select auth.uid())
    )
  );

-- Prevent the migration role from recreating R9 on future functions. Default
-- privileges are creator-specific; this protects functions created by the same
-- Lovable migration role, while every intended RPC still needs an explicit grant.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

-- R9: trigger helpers and the snapshot helper are internal implementation
-- details. Trigger execution and definer-to-definer calls do not require API
-- roles to retain EXECUTE.
revoke execute on function public.mandate_snapshot_hash(uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.reject_mandate_version_mutation()
  from public, anon, authenticated;
revoke execute on function public.guard_agent_identity_and_mandate()
  from public, anon, authenticated;
revoke execute on function public.create_initial_mandate_version()
  from public, anon, authenticated;
revoke execute on function public.require_new_evidence_mandate_version()
  from public, anon, authenticated;

-- Protect the hash-chained activity log from accidental privileged TRUNCATE.
-- This is not operator-independent integrity: the database owner remains trusted
-- and can bypass or replace database enforcement.
create or replace function public.reject_agent_events_truncate()
  returns trigger
  language plpgsql
  set search_path to 'public'
as $function$
begin
  raise exception 'agent_events_are_append_only'
    using errcode = 'insufficient_privilege';
end
$function$;

revoke execute on function public.reject_agent_events_truncate()
  from public, anon, authenticated;

drop trigger if exists agent_events_no_truncate on public.agent_events;
create trigger agent_events_no_truncate
  before truncate on public.agent_events
  for each statement execute function public.reject_agent_events_truncate();

comment on function public.reject_agent_events_truncate() is
  'Blocks accidental TRUNCATE of the hash-chained activity log. The database owner can still bypass database enforcement.';

-- Capability flip is deliberately last. The migration transaction exposes either
-- the disabled compatibility state or the enabled contracted state, never a mix.
do $function$
begin
  update public.product_capabilities
     set enabled = true,
         enabled_at = coalesce(enabled_at, statement_timestamp())
   where capability = 'mandate_reissue';

  if not found then
    raise exception 'mandate_reissue_capability_missing'
      using errcode = 'undefined_object';
  end if;
end
$function$;

-- Abort the migration if its security contract does not hold exactly.
do $function$
begin
  if has_table_privilege('authenticated', 'public.agents', 'INSERT')
     or has_table_privilege('authenticated', 'public.agents', 'UPDATE')
     or has_table_privilege('authenticated', 'public.agents', 'DELETE') then
    raise exception 'agents_direct_write_contract_failed'
      using errcode = 'insufficient_privilege';
  end if;

  if not has_table_privilege('authenticated', 'public.agents', 'SELECT') then
    raise exception 'agents_owner_read_contract_failed'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'agents'
       and policyname in ('owner insert agents', 'owner update agents', 'owner delete agents')
  ) then
    raise exception 'agents_direct_write_policy_contract_failed'
      using errcode = 'insufficient_privilege';
  end if;

  if has_function_privilege('anon', 'public.mandate_snapshot_hash(uuid,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.mandate_snapshot_hash(uuid,integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.reject_mandate_version_mutation()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.reject_mandate_version_mutation()', 'EXECUTE')
     or has_function_privilege('anon', 'public.guard_agent_identity_and_mandate()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.guard_agent_identity_and_mandate()', 'EXECUTE')
     or has_function_privilege('anon', 'public.create_initial_mandate_version()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.create_initial_mandate_version()', 'EXECUTE')
     or has_function_privilege('anon', 'public.require_new_evidence_mandate_version()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.require_new_evidence_mandate_version()', 'EXECUTE')
     or has_function_privilege('anon', 'public.reject_agent_events_truncate()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.reject_agent_events_truncate()', 'EXECUTE') then
    raise exception 'internal_function_execute_contract_failed'
      using errcode = 'insufficient_privilege';
  end if;

  -- Reissue trusts the owner UUID supplied by the authenticated application
  -- boundary, so no API role may execute it directly.
  if has_function_privilege(
       'anon',
       'public.reissue_agent_mandate(uuid,uuid,integer,text[],integer,integer,timestamp with time zone,uuid,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.reissue_agent_mandate(uuid,uuid,integer,text[],integer,integer,timestamp with time zone,uuid,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.reissue_agent_mandate(uuid,uuid,integer,text[],integer,integer,timestamp with time zone,uuid,text)',
       'EXECUTE'
     ) then
    raise exception 'mandate_reissue_execute_contract_failed'
      using errcode = 'insufficient_privilege';
  end if;

  -- The RPCs replacing direct table writes must remain authenticated-only.
  if has_function_privilege(
       'anon',
       'public.issue_agent(text,text,text,text[],integer,integer,timestamp with time zone,uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.issue_agent(text,text,text,text[],integer,integer,timestamp with time zone,uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.set_agent_status(uuid,text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.set_agent_status(uuid,text,text)',
       'EXECUTE'
     ) then
    raise exception 'agent_lifecycle_rpc_execute_contract_failed'
      using errcode = 'insufficient_privilege';
  end if;

  -- RLS remains mandatory on private lifecycle state. The one mandate-history
  -- policy must be the authenticated owner SELECT policy recreated above.
  if exists (
    select 1
      from (
        values
          ('public.agent_mandate_versions'::regclass),
          ('public.agent_mandate_requests'::regclass),
          ('public.product_capabilities'::regclass)
      ) as required(relation_id)
      join pg_class c on c.oid = required.relation_id
     where not c.relrowsecurity
  )
     or (select count(*) from pg_policies
          where schemaname = 'public' and tablename = 'agent_mandate_versions') <> 1
     or not exists (
       select 1
         from pg_policies
        where schemaname = 'public'
          and tablename = 'agent_mandate_versions'
          and policyname = 'owner reads mandate versions'
          and permissive = 'PERMISSIVE'
          and cmd = 'SELECT'
          and roles = array['authenticated']::name[]
     )
     or has_table_privilege('anon', 'public.product_capabilities', 'SELECT')
     or has_table_privilege('authenticated', 'public.product_capabilities', 'SELECT') then
    raise exception 'mandate_lifecycle_rls_contract_failed'
      using errcode = 'insufficient_privilege';
  end if;

  -- Do not activate against catalog drift. These triggers are permanent RPC
  -- invariants, not part of the direct-write compatibility surface.
  if exists (
    select 1
      from (
        values
          ('public.agents'::regclass, 'agents_guard_identity_and_mandate',
            'public.guard_agent_identity_and_mandate()'::regprocedure),
          ('public.agents'::regclass, 'agents_create_initial_mandate',
            'public.create_initial_mandate_version()'::regprocedure),
          ('public.agents'::regclass, 'agents_log',
            'public.log_agent_change()'::regprocedure),
          ('public.agent_events'::regclass, 'agent_events_chain',
            'public.chain_event()'::regprocedure),
          ('public.agent_events'::regclass, 'agent_events_no_truncate',
            'public.reject_agent_events_truncate()'::regprocedure),
          ('public.agent_mandate_versions'::regclass, 'mandate_versions_immutable',
            'public.reject_mandate_version_mutation()'::regprocedure),
          ('public.agent_mandate_versions'::regclass, 'mandate_versions_no_truncate',
            'public.reject_mandate_version_mutation()'::regprocedure),
          ('public.agent_mandate_requests'::regclass, 'mandate_requests_immutable',
            'public.reject_mandate_version_mutation()'::regprocedure),
          ('public.agent_mandate_requests'::regclass, 'mandate_requests_no_truncate',
            'public.reject_mandate_version_mutation()'::regprocedure),
          ('public.agent_usage'::regclass, 'agent_usage_requires_mandate_version',
            'public.require_new_evidence_mandate_version()'::regprocedure),
          ('public.approval_requests'::regclass, 'approval_requests_requires_mandate_version',
            'public.require_new_evidence_mandate_version()'::regprocedure)
      ) as required(relation_id, trigger_name, function_id)
     where not exists (
       select 1
         from pg_trigger t
        where t.tgrelid = required.relation_id
          and t.tgname = required.trigger_name
          and t.tgfoid = required.function_id
          and t.tgenabled = 'O'
          and not t.tgisinternal
     )
  ) then
    raise exception 'mandate_lifecycle_trigger_contract_failed'
      using errcode = 'integrity_constraint_violation';
  end if;

  if not exists (
    select 1
      from public.product_capabilities
     where capability = 'mandate_reissue'
       and enabled = true
       and enabled_at is not null
  ) then
    raise exception 'mandate_reissue_activation_failed'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
end
$function$;
