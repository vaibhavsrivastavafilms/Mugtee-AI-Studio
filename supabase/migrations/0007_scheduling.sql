-- Phase 7B: Production timeline scheduling. Adds 3 production-date columns.
-- Run in Supabase SQL Editor. Idempotent.
-- Note: existing column `scheduled_at` continues to serve as the publish date.

alter table public.content_pieces add column if not exists script_due_date timestamptz;
alter table public.content_pieces add column if not exists shoot_date       timestamptz;
alter table public.content_pieces add column if not exists edit_due_date    timestamptz;

create index if not exists content_pieces_script_due_idx on public.content_pieces (user_id, script_due_date) where script_due_date is not null;
create index if not exists content_pieces_shoot_date_idx on public.content_pieces (user_id, shoot_date)      where shoot_date      is not null;
create index if not exists content_pieces_edit_due_idx   on public.content_pieces (user_id, edit_due_date)   where edit_due_date   is not null;
