create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  tag text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Solo user can read events"
on public.events
for select
to authenticated
using (true);

create policy "Solo user can insert events"
on public.events
for insert
to authenticated
with check (true);
