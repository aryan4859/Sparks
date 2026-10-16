-- Sparks — database schema
-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is idempotent.

-- ─── Admins ──────────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

drop policy if exists "Admins can see the admin list" on public.admins;
create policy "Admins can see the admin list" on public.admins
  for select to authenticated using (public.is_admin());

-- ─── Places ──────────────────────────────────────────────────────────────
create table if not exists public.places (
  slug         text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null,
  category     text not null check (category in ('cafe', 'restaurant', 'shop')),
  type         text not null default '',
  neighborhood text not null default '',
  city         text not null default '',
  budget       smallint not null default 2 check (budget between 1 and 3),
  ambience     text[] not null default '{}',
  tagline      text not null default '',
  review       text not null default '',
  cover        text not null default '',
  gallery      text[] not null default '{}',
  lat          double precision,
  lng          double precision,
  address      text,
  hours        text,
  instagram    text,
  website      text,
  online       boolean not null default false,
  vegetarian   text check (vegetarian in ('pure-veg', 'veg-friendly')),
  signature    jsonb not null default '[]',
  menu         jsonb not null default '[]',
  featured     boolean not null default false,
  published    boolean not null default true,
  added_at     date not null default current_date,
  updated_at   timestamptz not null default now()
);
create index if not exists places_category_idx on public.places (category);

-- Practical attributes (keys from `features` in src/lib/site.ts: wifi, parking, …).
alter table public.places add column if not exists features text[] not null default '{}';

-- Places imported from OpenStreetMap keep their OSM id (e.g. "node/123"), so
-- re-running scripts/import-osm.mjs never duplicates or overwrites them.
alter table public.places add column if not exists osm_id text unique;
-- Admin list: fast search by name and filtering by status/city.
create index if not exists places_name_idx on public.places (lower(name));
create index if not exists places_published_idx on public.places (published);
create index if not exists places_city_idx on public.places (city);
alter table public.places enable row level security;

drop policy if exists "Anyone can read published places" on public.places;
create policy "Anyone can read published places" on public.places
  for select using (published or public.is_admin());
drop policy if exists "Admins can insert places" on public.places;
create policy "Admins can insert places" on public.places
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update places" on public.places;
create policy "Admins can update places" on public.places
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete places" on public.places;
create policy "Admins can delete places" on public.places
  for delete to authenticated using (public.is_admin());

-- ─── Journal posts ───────────────────────────────────────────────────────
create table if not exists public.posts (
  slug       text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title      text not null,
  excerpt    text not null default '',
  cover      text not null default '',
  date       date not null default current_date,
  body       text not null default '',          -- lightweight markdown, see src/lib/markdown.ts
  published  boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.posts enable row level security;

drop policy if exists "Anyone can read published posts" on public.posts;
create policy "Anyone can read published posts" on public.posts
  for select using (published or public.is_admin());
drop policy if exists "Admins can insert posts" on public.posts;
create policy "Admins can insert posts" on public.posts
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update posts" on public.posts;
create policy "Admins can update posts" on public.posts
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts" on public.posts
  for delete to authenticated using (public.is_admin());

-- When the story was emailed to subscribers (null = not yet). Claimed atomically
-- before sending, so a story is never emailed twice.
alter table public.posts add column if not exists notified_at timestamptz;
-- How many emails went out, and why sending stopped early (shown in the editor).
alter table public.posts add column if not exists notified_count integer;
alter table public.posts add column if not exists notify_error text;
-- Same for places: new places can be emailed to subscribers too.
alter table public.places add column if not exists notified_at timestamptz;
alter table public.places add column if not exists notified_count integer;
alter table public.places add column if not exists notify_error text;

-- ─── Newsletter subscribers ──────────────────────────────────────────────
create table if not exists public.subscribers (
  email           text primary key check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token           uuid not null unique default gen_random_uuid(),  -- for unsubscribe links
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);
alter table public.subscribers enable row level security;

-- Visitors never touch the table directly: they go through these two functions.
-- Double opt-in: an address only receives newsletters once its owner clicks the
-- link in the confirmation email (confirmed_at). Added 16 October 2026; everyone
-- who signed up before then counts as confirmed.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'subscribers' and column_name = 'confirmed_at') then
    alter table public.subscribers add column confirmed_at timestamptz;
    update public.subscribers set confirmed_at = created_at;
  end if;
end;
$$;
alter table public.subscribers add column if not exists confirm_sent_at timestamptz;

-- Sign up. Returns the token to put in a confirmation email, or null when no email
-- should go out: already subscribed, a confirmation was sent less than an hour ago,
-- or more than 30 were sent site-wide in the last hour (so a bot can't use up the
-- Gmail allowance). Unconfirmed sign-ups are forgotten after 30 days.
drop function if exists public.subscribe(text);
create function public.subscribe(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  t uuid;
begin
  delete from public.subscribers where confirmed_at is null and created_at < now() - interval '30 days';

  if (select count(*) from public.subscribers where confirm_sent_at > now() - interval '1 hour') >= 30 then
    return null;
  end if;

  insert into public.subscribers as s (email, confirm_sent_at) values (lower(trim(p_email)), now())
  on conflict (email) do update set
    unsubscribed_at = null,
    -- Someone who left must confirm again before they're emailed.
    confirmed_at = case when s.unsubscribed_at is not null then null else s.confirmed_at end,
    confirm_sent_at = now()
  where s.unsubscribed_at is not null
     or (s.confirmed_at is null and (s.confirm_sent_at is null or s.confirm_sent_at < now() - interval '1 hour'))
  returning s.token into t;
  return t;
end;
$$;

-- Confirm from the email link. {"status": "confirmed", "email": …} the first time
-- (the app then sends the welcome email), "already" after that, "invalid" otherwise.
create or replace function public.confirm_subscription(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e text;
begin
  update public.subscribers set confirmed_at = now()
  where token = p_token and confirmed_at is null and unsubscribed_at is null
  returning email into e;
  if e is not null then
    return jsonb_build_object('status', 'confirmed', 'email', e);
  end if;
  if exists (select 1 from public.subscribers where token = p_token and unsubscribed_at is null) then
    return jsonb_build_object('status', 'already');
  end if;
  return jsonb_build_object('status', 'invalid');
end;
$$;

create or replace function public.unsubscribe(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.subscribers set unsubscribed_at = now()
  where token = p_token and unsubscribed_at is null;
  return found or exists (select 1 from public.subscribers where token = p_token);
end;
$$;

revoke execute on function public.subscribe(text) from public;
revoke execute on function public.unsubscribe(uuid) from public;
grant execute on function public.subscribe(text) to anon, authenticated;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;
revoke execute on function public.confirm_subscription(uuid) from public;
grant execute on function public.confirm_subscription(uuid) to anon, authenticated;

drop policy if exists "Admins can see subscribers" on public.subscribers;
create policy "Admins can see subscribers" on public.subscribers
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins can delete subscribers" on public.subscribers;
create policy "Admins can delete subscribers" on public.subscribers
  for delete to authenticated using (public.is_admin());

-- ─── Place suggestions from visitors ─────────────────────────────────────
create table if not exists public.suggestions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 1 and 120),
  category   text not null check (category in ('cafe', 'restaurant', 'shop')),
  area       text not null default '' check (length(area) <= 120),
  maps_link  text not null default '' check (length(maps_link) <= 600),
  note       text not null default '' check (length(note) <= 1000),
  created_at timestamptz not null default now()
);
alter table public.suggestions enable row level security;

-- Visitors add suggestions only through this function. Past 50 in an hour it
-- quietly refuses, so a bot can't flood the table.
create or replace function public.suggest_place(p_name text, p_category text, p_area text, p_maps_link text, p_note text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.suggestions where created_at > now() - interval '1 hour') >= 50 then
    return false;
  end if;
  insert into public.suggestions (name, category, area, maps_link, note)
  values (trim(p_name), p_category, trim(coalesce(p_area, '')), trim(coalesce(p_maps_link, '')), trim(coalesce(p_note, '')));
  return true;
end;
$$;
revoke execute on function public.suggest_place(text, text, text, text, text) from public;
grant execute on function public.suggest_place(text, text, text, text, text) to anon, authenticated;

drop policy if exists "Admins can see suggestions" on public.suggestions;
create policy "Admins can see suggestions" on public.suggestions
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins can delete suggestions" on public.suggestions;
create policy "Admins can delete suggestions" on public.suggestions
  for delete to authenticated using (public.is_admin());

-- ─── Curated lists ("Best momo in Patan") ──────────────────────────────────
create table if not exists public.lists (
  slug       text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title      text not null check (length(title) between 1 and 120),
  intro      text not null default '',
  cover      text not null default '',
  places     text[] not null default '{}',   -- place slugs, in the order shown
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lists enable row level security;

drop policy if exists "Anyone can read published lists" on public.lists;
create policy "Anyone can read published lists" on public.lists
  for select using (published or public.is_admin());
drop policy if exists "Admins can insert lists" on public.lists;
create policy "Admins can insert lists" on public.lists
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update lists" on public.lists;
create policy "Admins can update lists" on public.lists
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete lists" on public.lists;
create policy "Admins can delete lists" on public.lists
  for delete to authenticated using (public.is_admin());

-- ─── Neighbourhood guides ────────────────────────────────────────────────
-- Every neighbourhood with a published place gets a page automatically; this
-- table only holds the optional intro and cover photo, keyed by its slug.
create table if not exists public.areas (
  slug       text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null,
  intro      text not null default '',
  cover      text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.areas enable row level security;

drop policy if exists "Anyone can read areas" on public.areas;
create policy "Anyone can read areas" on public.areas for select using (true);
drop policy if exists "Admins can insert areas" on public.areas;
create policy "Admins can insert areas" on public.areas
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update areas" on public.areas;
create policy "Admins can update areas" on public.areas
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete areas" on public.areas;
create policy "Admins can delete areas" on public.areas
  for delete to authenticated using (public.is_admin());

-- ─── Photo storage ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
-- Uploads are shrunk to WebP in the browser (usually under 1 MB). The bucket
-- enforces it too: images only, at most 5 MB each.
update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
where id = 'media';

drop policy if exists "Admins can upload media" on storage.objects;
create policy "Admins can upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "Admins can update media" on storage.objects;
create policy "Admins can update media" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists "Admins can delete media" on storage.objects;
create policy "Admins can delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ─── Make yourself an admin ──────────────────────────────────────────────
-- 1. Dashboard → Authentication → Users → Add user → Create new user
--    (enter your email + a password, tick "Auto Confirm User").
-- 2. Replace the email below and run this statement:
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'you@example.com';
