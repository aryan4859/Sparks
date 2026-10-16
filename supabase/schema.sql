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

-- ─── Newsletter subscribers ──────────────────────────────────────────────
create table if not exists public.subscribers (
  email           text primary key check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token           uuid not null unique default gen_random_uuid(),  -- for unsubscribe links
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);
alter table public.subscribers enable row level security;

-- Visitors never touch the table directly: they go through these two functions.
-- Returns the unsubscribe token for a new or returning subscriber (who then gets a
-- welcome email), or null if they're already subscribed.
drop function if exists public.subscribe(text);
create function public.subscribe(p_email text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.subscribers as s (email) values (lower(trim(p_email)))
  on conflict (email) do update set unsubscribed_at = null
    where s.unsubscribed_at is not null
  returning s.token;
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

drop policy if exists "Admins can see subscribers" on public.subscribers;
create policy "Admins can see subscribers" on public.subscribers
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins can delete subscribers" on public.subscribers;
create policy "Admins can delete subscribers" on public.subscribers
  for delete to authenticated using (public.is_admin());

-- ─── Photo storage ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

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
