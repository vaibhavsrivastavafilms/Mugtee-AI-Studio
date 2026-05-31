-- Mugtee Storyboard Continuity Engine — persistent visual bible per project.
alter table public.cinematic_projects
  add column if not exists story_bible jsonb;

comment on column public.cinematic_projects.story_bible is
  'StoryBible continuity: character, palette, environment, camera, mood, locks';
