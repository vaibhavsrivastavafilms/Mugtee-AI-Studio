-- Phase 2.8 — Usage counters on profiles for plan limit foundation.

alter table public.profiles
  add column if not exists projects_count integer not null default 0,
  add column if not exists generations_count integer not null default 0,
  add column if not exists exports_count integer not null default 0,
  add column if not exists renders_count integer not null default 0;

comment on column public.profiles.projects_count is 'Lifetime projects created (FREE plan cap).';
comment on column public.profiles.generations_count is 'Lifetime AI generations (FREE plan cap).';
comment on column public.profiles.exports_count is 'Lifetime exports / creator packs (FREE plan cap).';
comment on column public.profiles.renders_count is 'Lifetime MP4 reel renders (FREE plan cap).';
