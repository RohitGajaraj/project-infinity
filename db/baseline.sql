-- Baseline: faithful dump of the live phase-1 schema as of 2026-09-29.
-- Exported by Lovable from the running database. Behaviour is unchanged.
-- Lives in db/ (not supabase/migrations/) because that folder is written only
-- by Lovable's migration tool. Use it to rebuild on a self-owned Postgres;
-- then apply supabase/migrations/20260929173000_waitlist.sql after it.
-- Already live in Lovable Cloud — do NOT re-apply there.
-- Assumes Supabase roles (anon, authenticated, service_role), auth.uid(), auth.users.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tables
create table public.profiles (
  id                uuid        not null primary key,
  display_name      text        not null default '',
  identity_verified boolean     not null default false,
  created_at        timestamptz not null default now()
);

create or replace function public.gen_agent_public_id()
 returns text
 language plpgsql
as $function$
DECLARE chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; s text := ''; i int;
BEGIN
  FOR i IN 1..12 LOOP
    s := s || substr(chars, 1 + floor(random()*length(chars))::int, 1);
    IF i IN (4,8) THEN s := s || '-'; END IF;
  END LOOP;
  RETURN 'inf_' || s;
END $function$;

create table public.agents (
  id                  uuid        not null default gen_random_uuid() primary key,
  public_id           text        not null default public.gen_agent_public_id(),
  owner_id            uuid        not null default auth.uid(),
  name                text        not null,
  source              text        not null,
  status              text        not null default 'valid',
  public_key          text        not null,
  permissions         text[]      not null default '{}'::text[],
  monthly_spend_limit integer     not null default 0,
  approval_above      integer     not null default 0,
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null default (now() + interval '6 mons'),
  constraint agents_public_id_key unique (public_id),
  constraint agents_status_check check (status = any (array['valid'::text, 'frozen'::text]))
);

create table public.agent_events (
  id         bigserial   not null primary key,
  agent_id   uuid        not null references public.agents(id) on delete cascade,
  kind       text        not null,
  detail     text        not null default '',
  prev_hash  text        not null default '',
  hash       text        not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- grants (exactly as live)
grant select, insert, update, delete on public.profiles     to anon, authenticated, service_role;
grant select, insert, update, delete on public.agents       to anon, authenticated, service_role;
grant select, insert, update, delete on public.agent_events to anon, authenticated, service_role;
grant usage, select on sequence public.agent_events_id_seq  to anon, authenticated, service_role;

-- ---------------------------------------------------------------- RLS (verbatim)
alter table public.profiles     enable row level security;
alter table public.agents       enable row level security;
alter table public.agent_events enable row level security;

create policy "own profile read"   on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "owner read agents"   on public.agents for select to authenticated using (auth.uid() = owner_id);
create policy "owner insert agents" on public.agents for insert to authenticated with check (auth.uid() = owner_id);
create policy "owner update agents" on public.agents for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner delete agents" on public.agents for delete to authenticated using (auth.uid() = owner_id);

create policy "owner read events" on public.agent_events for select to authenticated
  using (exists (select 1 from public.agents a where a.id = agent_events.agent_id and a.owner_id = auth.uid()));
-- No insert/update/delete policies on agent_events: only the security-definer trigger writes it.

-- ---------------------------------------------------------------- functions
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $function$;

create or replace function public.chain_event()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
DECLARE last text;
BEGIN
  SELECT hash INTO last FROM public.agent_events WHERE agent_id = NEW.agent_id ORDER BY id DESC LIMIT 1;
  NEW.prev_hash := COALESCE(last, 'genesis');
  NEW.hash := encode(extensions.digest(NEW.prev_hash || '|' || NEW.agent_id::text || '|' || NEW.kind || '|' || NEW.detail || '|' || NEW.created_at::text, 'sha256'), 'hex');
  RETURN NEW;
END $function$;

create or replace function public.log_agent_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agent_events(agent_id, kind, detail) VALUES (NEW.id, 'issued', 'Agent ID ' || NEW.public_id || ' issued, public key registered');
  ELSIF NEW.status <> OLD.status THEN
    INSERT INTO public.agent_events(agent_id, kind, detail) VALUES (NEW.id, CASE WHEN NEW.status='frozen' THEN 'frozen' ELSE 'unfrozen' END, 'Owner set status to ' || NEW.status);
  ELSIF NEW.permissions IS DISTINCT FROM OLD.permissions OR NEW.monthly_spend_limit <> OLD.monthly_spend_limit OR NEW.approval_above <> OLD.approval_above THEN
    INSERT INTO public.agent_events(agent_id, kind, detail) VALUES (NEW.id, 'limits', 'Owner updated limits');
  END IF;
  RETURN NEW;
END $function$;

create or replace function public.verify_agent(_public_id text)
 returns table(public_id text, name text, source text, status text, owner_name text, owner_verified boolean, permissions text[], monthly_spend_limit integer, approval_above integer, public_key text, created_at timestamptz, expires_at timestamptz, last_hash text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  SELECT a.public_id, a.name, a.source, a.status, p.display_name, p.identity_verified,
    a.permissions, a.monthly_spend_limit, a.approval_above, a.public_key, a.created_at, a.expires_at,
    (SELECT e.hash FROM public.agent_events e WHERE e.agent_id = a.id ORDER BY e.id DESC LIMIT 1)
  FROM public.agents a LEFT JOIN public.profiles p ON p.id = a.owner_id
  WHERE a.public_id = _public_id
$function$;

-- Live ACL: PUBLIC execute revoked on verify_agent, granted to API roles.
revoke execute on function public.verify_agent(text) from public;
grant execute on function public.verify_agent(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- triggers
create trigger agent_events_chain before insert on public.agent_events
  for each row execute function public.chain_event();
create trigger agents_log after insert or update on public.agents
  for each row execute function public.log_agent_change();
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
