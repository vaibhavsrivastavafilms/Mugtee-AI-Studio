-- Reel render tracking for Remotion MP4 exports (1080x1920 vertical).

alter table public.cinematic_projects
  add column if not exists reel_status text,
  add column if not exists reel_url text,
  add column if not exists reel_rendered_at timestamptz;

comment on column public.cinematic_projects.reel_status is
  'Remotion reel pipeline: pending | assembling | rendering | ready | failed';

comment on column public.cinematic_projects.reel_url is
  'Public URL for final-reel.mp4 in Supabase Storage bucket reels/{project-id}/';

comment on column public.cinematic_projects.reel_rendered_at is
  'Timestamp when reel_url was last written by the render pipeline';

-- Public read for reels bucket (upload restricted to authenticated service role / RLS policies).
insert into storage.buckets (id, name, public)
values ('reels', 'reels', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "reels read public" on storage.objects;
create policy "reels read public"
  on storage.objects for select
  using (bucket_id = 'reels');

drop policy if exists "reels authenticated upload" on storage.objects;
create policy "reels authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'reels' and auth.role() = 'authenticated');

drop policy if exists "reels authenticated update" on storage.objects;
create policy "reels authenticated update"
  on storage.objects for update
  using (bucket_id = 'reels' and auth.role() = 'authenticated');
