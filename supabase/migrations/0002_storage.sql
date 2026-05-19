-- Phase 3A.1: Storage bucket + RLS for Table Tales media
-- Paste this into Supabase SQL Editor after the initial migration.

-- Create the storage bucket (public-read so signed-URL fetches aren't needed for previews).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Per-user folder isolation: first segment of object name must equal auth.uid().
do $$
begin
  begin
    create policy "media owner upload" on storage.objects
      for insert to authenticated
      with check ( bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text );
  exception when duplicate_object then null; end;

  begin
    create policy "media owner update" on storage.objects
      for update to authenticated
      using ( bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text );
  exception when duplicate_object then null; end;

  begin
    create policy "media owner delete" on storage.objects
      for delete to authenticated
      using ( bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text );
  exception when duplicate_object then null; end;

  -- Public read of the bucket is already allowed because public=true.
end $$;
