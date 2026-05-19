-- Phase 3D + 3E: Soft-delete, archive, and theme support.
-- Run in Supabase SQL Editor. Idempotent.

alter table public.content_pieces add column if not exists archived boolean default false;
alter table public.content_pieces add column if not exists deleted_at timestamptz;

alter table public.crew add column if not exists archived boolean default false;
alter table public.crew add column if not exists deleted_at timestamptz;

alter table public.shoots add column if not exists archived boolean default false;
alter table public.shoots add column if not exists deleted_at timestamptz;

alter table public.media add column if not exists archived boolean default false;
alter table public.media add column if not exists deleted_at timestamptz;

alter table public.workspaces add column if not exists theme text default 'gold';

-- Helpful partial indexes for active rows
create index if not exists content_pieces_active_idx on public.content_pieces (user_id) where deleted_at is null;
create index if not exists crew_active_idx           on public.crew (user_id)           where deleted_at is null;
create index if not exists shoots_active_idx         on public.shoots (user_id)         where deleted_at is null;
create index if not exists media_active_idx          on public.media (user_id)          where deleted_at is null;
