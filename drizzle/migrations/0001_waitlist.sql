-- Waitlist capture for the public home page.
--
-- Why this exists: the home page form currently discards the email
-- (DIRECTION.md §9 G10). It is the only mechanism on the site that produces
-- market contact, and phase 1's revised success test depends on reaching
-- verifiers, so it needs to actually store something.
--
-- Security shape: anonymous visitors may INSERT and nothing else. Nobody can
-- read the list through the API — not even an authenticated user — because an
-- email list is exactly the sort of thing that leaks from an over-permissive
-- SELECT policy. Reads happen through the Lovable/Supabase console.

create table if not exists public.waitlist (
  id          bigint generated always as identity primary key,
  email       text        not null,
  note        text        not null default '',
  -- Where the signup came from, so we can tell the console form from the API.
  source      text        not null default 'home',
  created_at  timestamptz not null default now(),
  constraint waitlist_email_shape check (
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and length(email) <= 254
  ),
  constraint waitlist_note_len check (length(note) <= 500),
  constraint waitlist_source_len check (length(source) <= 40)
);

-- One row per address: re-submitting is idempotent rather than an error.
create unique index if not exists waitlist_email_key
  on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- Explicit grants: RLS only filters rows that a role is already allowed to touch.
revoke all on public.waitlist from anon, authenticated;
grant insert on public.waitlist to anon, authenticated;

drop policy if exists "waitlist_anon_insert" on public.waitlist;
create policy "waitlist_anon_insert"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- No select/update/delete policy is defined on purpose, so none is permitted.

comment on table public.waitlist is
  'Public signup capture. Insert-only for anon and authenticated; readable only via the console.';
