-- Phase 6A: Viral Script Engine. Adds dedicated script field on content_pieces.
-- Run in Supabase SQL Editor. Idempotent.

alter table public.content_pieces add column if not exists script text;
