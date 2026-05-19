-- Phase 3C: Workspaces table for per-user studio settings
-- One row per user (unique on user_id). Run in Supabase SQL Editor.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  name text not null default 'My Studio',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

do $$
begin
  begin
    create policy "owner read"   on public.workspaces for select to authenticated using (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy "owner insert" on public.workspaces for insert to authenticated with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy "owner update" on public.workspaces for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;

alter publication supabase_realtime add table public.workspaces;
