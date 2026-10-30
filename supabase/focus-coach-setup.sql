-- Additive setup, independent of the existing tracking tables.
-- Run once in Supabase SQL Editor after choosing the project.
begin;
create table if not exists public.focus_coach_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_date date not null,
  state jsonb not null,
  version integer not null default 0,
  unique(user_id, day_date)
);
create table if not exists public.focus_coach_devices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null
);
alter table public.focus_coach_days enable row level security;
alter table public.focus_coach_devices enable row level security;
-- All access goes through the authenticated server, including reads.
revoke all on public.focus_coach_days, public.focus_coach_devices from public, anon, authenticated;
grant select, insert, update, delete on public.focus_coach_days, public.focus_coach_devices to service_role;
commit;
