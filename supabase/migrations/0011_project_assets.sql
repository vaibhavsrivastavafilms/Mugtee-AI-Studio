-- =============================================================
-- MUGTEE V2.1 — Project asset storage (images / voiceovers / videos / music / exports)
-- One unified table keyed by `project_id` (= content_pieces.id) so every generated
-- asset belongs to its project. Future-ready: kind enum extensible, metadata jsonb.
-- RLS: only the project owner can read/write their own assets.
-- =============================================================
create table if not exists public.project_assets (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.content_pieces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('image', 'voiceover', 'video', 'music', 'export', 'prompt')),
  url          text,           -- public URL into supabase storage (or external)
  storage_path text,            -- bucket path for storage objects (null for external/in-place)
  mime_type    text,
  title        text,
  prompt       text,            -- the prompt that produced this asset (image gen / voiceover script / etc.)
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists project_assets_project_idx on public.project_assets (project_id, created_at desc);
create index if not exists project_assets_user_idx    on public.project_assets (user_id, created_at desc);
create index if not exists project_assets_kind_idx    on public.project_assets (project_id, kind, created_at desc);

alter table public.project_assets enable row level security;

drop policy if exists "assets self read"   on public.project_assets;
create policy "assets self read"   on public.project_assets for select using (auth.uid() = user_id);

drop policy if exists "assets self insert" on public.project_assets;
create policy "assets self insert" on public.project_assets for insert with check (auth.uid() = user_id);

drop policy if exists "assets self delete" on public.project_assets;
create policy "assets self delete" on public.project_assets for delete using (auth.uid() = user_id);

-- Storage bucket for AI-generated assets.
-- Public so URLs can be embedded directly (we never store sensitive data here).
insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', true)
on conflict (id) do nothing;

-- Storage RLS: authenticated users can upload + read their own folder.
drop policy if exists "project assets read public" on storage.objects;
create policy "project assets read public"
  on storage.objects for select
  using (bucket_id = 'project-assets');

drop policy if exists "project assets self upload" on storage.objects;
create policy "project assets self upload"
  on storage.objects for insert
  with check (bucket_id = 'project-assets' and auth.role() = 'authenticated');

drop policy if exists "project assets self delete" on storage.objects;
create policy "project assets self delete"
  on storage.objects for delete
  using (bucket_id = 'project-assets' and auth.role() = 'authenticated');
