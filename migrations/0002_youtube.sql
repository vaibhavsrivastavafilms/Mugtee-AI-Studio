-- Phase P4 — YouTube Publishing MVP. Run ONCE in your Supabase SQL editor.
-- One row per user in youtube_accounts (tokens + channel). Three new columns on content_pieces
-- track upload state without disturbing the existing status enum.

create table if not exists public.youtube_accounts (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  access_token   text not null,
  refresh_token  text not null,
  expires_at     timestamptz not null,
  scope          text,
  token_type     text,
  channel_id     text not null,
  channel_title  text not null,
  channel_thumb  text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create or replace function public.tg_youtube_accounts_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists trg_youtube_accounts_updated_at on public.youtube_accounts;
create trigger trg_youtube_accounts_updated_at
  before update on public.youtube_accounts
  for each row execute function public.tg_youtube_accounts_set_updated_at();

alter table public.youtube_accounts enable row level security;

drop policy if exists youtube_accounts_owner_all on public.youtube_accounts;
create policy youtube_accounts_owner_all on public.youtube_accounts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Upload state on content_pieces. Idempotent column adds.
alter table public.content_pieces add column if not exists youtube_video_id text;
alter table public.content_pieces add column if not exists youtube_status text check (youtube_status in ('uploading','published','failed'));
alter table public.content_pieces add column if not exists youtube_error text;
