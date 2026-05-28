-- Phase 5A: Notifications, reminders, publishing queue, recurring workflows.
-- Run in Supabase SQL Editor. Idempotent.

-- ============ NOTIFICATIONS ============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  type text default 'info',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
do $$ begin
  begin create policy "owner read"   on public.notifications for select to authenticated using (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner insert" on public.notifications for insert to authenticated with check (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner delete" on public.notifications for delete to authenticated using (user_id = auth.uid()); exception when duplicate_object then null; end;
end $$;
alter publication supabase_realtime add table public.notifications;
create index if not exists notifications_user_unread_idx on public.notifications (user_id, read) where read = false;

-- ============ REMINDER FIELDS ============
alter table public.content_pieces add column if not exists reminder_at timestamptz;
alter table public.content_pieces add column if not exists reminder_sent boolean default false;
alter table public.shoots         add column if not exists reminder_at timestamptz;
alter table public.shoots         add column if not exists reminder_sent boolean default false;

-- ============ PUBLISHING QUEUE ============
create table if not exists public.publishing_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid references public..select(id) on delete cascade,
  platform text,
  scheduled_for timestamptz,
  status text not null default 'queued',
  retry_count int not null default 0,
  error text,
  created_at timestamptz not null default now()
);
alter table public.publishing_queue enable row level security;
do $$ begin
  begin create policy "owner read"   on public.publishing_queue for select to authenticated using (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner insert" on public.publishing_queue for insert to authenticated with check (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner update" on public.publishing_queue for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner delete" on public.publishing_queue for delete to authenticated using (user_id = auth.uid()); exception when duplicate_object then null; end;
end $$;
alter publication supabase_realtime add table public.publishing_queue;

-- ============ RECURRING WORKFLOWS ============
create table if not exists public.recurring_workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  frequency text not null default 'weekly',
  next_run timestamptz,
  enabled boolean not null default true,
  last_run timestamptz,
  created_at timestamptz not null default now()
);
alter table public.recurring_workflows enable row level security;
do $$ begin
  begin create policy "owner read"   on public.recurring_workflows for select to authenticated using (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner insert" on public.recurring_workflows for insert to authenticated with check (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner update" on public.recurring_workflows for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner delete" on public.recurring_workflows for delete to authenticated using (user_id = auth.uid()); exception when duplicate_object then null; end;
end $$;
alter publication supabase_realtime add table public.recurring_workflows;
