-- Phase 8: Instagram Publishing MVP.
-- Run in Supabase SQL Editor. Idempotent.

-- ============ INSTAGRAM ACCOUNTS ============
create table if not exists public.instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ig_business_id text not null,
  page_id text not null,
  page_access_token text not null,
  username text,
  connected_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id)
);
alter table public.instagram_accounts enable row level security;
do $$ begin
  begin create policy "owner read"   on public.instagram_accounts for select to authenticated using (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner insert" on public.instagram_accounts for insert to authenticated with check (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner update" on public.instagram_accounts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "owner delete" on public.instagram_accounts for delete to authenticated using (user_id = auth.uid()); exception when duplicate_object then null; end;
end $$;
alter publication supabase_realtime add table public.instagram_accounts;

-- ============ CONTENT MEDIA URL ============
alter table public.content_pieces add column if not exists media_url text;

-- ============ QUEUE POST METADATA ============
alter table public.publishing_queue add column if not exists post_url text;
alter table public.publishing_queue add column if not exists published_at timestamptz;
