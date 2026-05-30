-- Phase 2 Quick Cut fields: language lock, transcript source, variation history, Virlo script/style.

alter table public.cinematic_projects
  add column if not exists language text,
  add column if not exists input_type text,
  add column if not exists original_transcript text,
  add column if not exists variation_history jsonb,
  add column if not exists visual_style jsonb,
  add column if not exists viral_script jsonb;
