-- Canonical reel-native script beats on cinematic_projects.
-- Pipeline: Hook → scriptBeats → Payoff → CTA → Storyboard → Voice → Video

alter table public.cinematic_projects
  add column if not exists script_beats jsonb;

comment on column public.cinematic_projects.script_beats is
  'Reel-native script structure: { beats: [{narration,duration,emotion}], payoff?, cta? }. Flat script column kept for legacy export.';
