-- Table Tales · Production OS
-- Run this in your Supabase SQL editor.
-- Drops are commented out; uncomment if you need a clean slate.

-- create extension if not exists "pgcrypto";

-- ============ CONTENT PIECES ============
create table if not exists public.content_pieces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'idea',          -- idea|scripting|shooting|editing|scheduled|published
  platform text not null default 'youtube',     -- youtube|instagram|tiktok|twitter|linkedin
  thumbnail text,
  scheduled_at timestamptz,
  due_date date,
  assignee text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ CREW ============
create table if not exists public.crew (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text,
  email text,
  avatar_url text,
  status text default 'active',                  -- active|busy|offline
  created_at timestamptz not null default now()
);

-- ============ SHOOTS ============
create table if not exists public.shoots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date,
  start_time time,
  end_time time,
  location text,
  crew_ids uuid[] default '{}',
  status text default 'planned',                 -- planned|today|wrapped
  notes text,
  created_at timestamptz not null default now()
);

-- ============ MEDIA ============
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text default 'image',                     -- image|video|audio
  url text,
  thumbnail text,
  size_bytes bigint,
  content_id uuid references public..select(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============ TEAM ACTIVITY ============
create table if not exists public.team_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor text,
  action text,
  target text,
  created_at timestamptz not null default now()
);

-- ============ ROW LEVEL SECURITY ============
alter table public.content_pieces enable row level security;
alter table public.crew           enable row level security;
alter table public.shoots         enable row level security;
alter table public.media          enable row level security;
alter table public.team_activity  enable row level security;

-- Polymorphic policy helper macro (one for each table)
do $$
begin
  -- Content pieces
  begin
    create policy "owner read"   on public.content_pieces for select to authenticated using (user_id = auth.uid());
    create policy "owner insert" on public.content_pieces for insert to authenticated with check (user_id = auth.uid());
    create policy "owner update" on public.content_pieces for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy "owner delete" on public.content_pieces for delete to authenticated using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  -- Crew
  begin
    create policy "owner read"   on public.crew for select to authenticated using (user_id = auth.uid());
    create policy "owner insert" on public.crew for insert to authenticated with check (user_id = auth.uid());
    create policy "owner update" on public.crew for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy "owner delete" on public.crew for delete to authenticated using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  -- Shoots
  begin
    create policy "owner read"   on public.shoots for select to authenticated using (user_id = auth.uid());
    create policy "owner insert" on public.shoots for insert to authenticated with check (user_id = auth.uid());
    create policy "owner update" on public.shoots for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy "owner delete" on public.shoots for delete to authenticated using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  -- Media
  begin
    create policy "owner read"   on public.media for select to authenticated using (user_id = auth.uid());
    create policy "owner insert" on public.media for insert to authenticated with check (user_id = auth.uid());
    create policy "owner update" on public.media for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy "owner delete" on public.media for delete to authenticated using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  -- Team activity
  begin
    create policy "owner read"   on public.team_activity for select to authenticated using (user_id = auth.uid());
    create policy "owner insert" on public.team_activity for insert to authenticated with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;

-- ============ REALTIME ============
alter publication supabase_realtime add table public.content_pieces;
alter publication supabase_realtime add table public.crew;
alter publication supabase_realtime add table public.shoots;
alter publication supabase_realtime add table public.media;
alter publication supabase_realtime add table public.team_activity;
