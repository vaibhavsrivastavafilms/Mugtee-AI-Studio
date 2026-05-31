-- Mugtee Cinematic Motion Engine V1
-- Preset catalog + per-project scene motion assignments.
--
-- Storage choice: scene_motion lives on cinematic_projects (jsonb) rather than a
-- separate scene_motion table — one project row already holds scenes/voice/story
-- bible; motion is keyed by scene id and stays colocated with the reel payload.

create table if not exists public.motion_presets (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text not null default '',
  remotion_config jsonb not null default '{}'::jsonb,
  ffmpeg_filter jsonb not null default '{}'::jsonb,
  category      text not null default 'ken_burns',
  created_at    timestamptz not null default now()
);

alter table public.cinematic_projects
  add column if not exists scene_motion jsonb not null default '{}'::jsonb;

comment on column public.cinematic_projects.scene_motion is
  'Per-scene motion preset assignments: { "<sceneId>": { "presetId": "push_in", "params": {}, "source": "auto|manual" } }';

comment on table public.motion_presets is
  'Ken Burns / pan / drift presets for Remotion reel export';

-- Seed default presets (idempotent via slug)
insert into public.motion_presets (slug, name, description, remotion_config, ffmpeg_filter, category)
values
  (
    'documentary_drift',
    'Documentary Drift',
    'Subtle handheld-style drift — observational documentary tone.',
    '{"scaleFrom":1.04,"scaleTo":1.08,"translateXFrom":-8,"translateXTo":10,"translateYFrom":4,"translateYTo":-6,"easing":"linear"}'::jsonb,
    '{"filter":"zoompan=z=''min(zoom+0.0008,1.08)'':d=125:x=''iw/2-(iw/zoom/2)+8*sin(on/20)'':y=''ih/2-(ih/zoom/2)+4*cos(on/25)''"}'::jsonb,
    'drift'
  ),
  (
    'historical_push_in',
    'Historical Push-In',
    'Deliberate slow push — gravitas for history and legacy beats.',
    '{"scaleFrom":1,"scaleTo":1.14,"translateXFrom":0,"translateXTo":0,"translateYFrom":2,"translateYTo":-4,"easing":"ease-out"}'::jsonb,
    '{"filter":"zoompan=z=''min(zoom+0.0010,1.14)'':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)"}'::jsonb,
    'ken_burns'
  ),
  (
    'battle_tracking',
    'Battle Tracking',
    'Low handheld tracking with tension shake — conflict sequences.',
    '{"scaleFrom":1.12,"scaleTo":1.14,"translateXFrom":-22,"translateXTo":22,"translateYFrom":6,"translateYTo":-8,"easing":"linear"}'::jsonb,
    '{"filter":"zoompan=z=1.12:d=125:x=''iw/2-(iw/zoom/2)+12*sin(on/8)'':y=''ih/2-(ih/zoom/2)+6*sin(on/11)''"}'::jsonb,
    'pan'
  ),
  (
    'luxury_reveal',
    'Luxury Reveal',
    'Elegant pull-back reveal with soft light drift — premium tone.',
    '{"scaleFrom":1.14,"scaleTo":1.04,"translateXFrom":0,"translateXTo":0,"translateYFrom":-6,"translateYTo":0,"easing":"ease-out"}'::jsonb,
    '{"filter":"zoompan=z=''if(lte(zoom,1.0),1.14,max(1.001,zoom-0.0009))'':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)"}'::jsonb,
    'ken_burns'
  ),
  (
    'emotional_close_up',
    'Emotional Close-Up',
    'Intimate slow push — faces, confession, and peak emotion.',
    '{"scaleFrom":1.02,"scaleTo":1.2,"translateXFrom":0,"translateXTo":0,"translateYFrom":0,"translateYTo":-8,"easing":"ease-out"}'::jsonb,
    '{"filter":"zoompan=z=''min(zoom+0.0016,1.2)'':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)"}'::jsonb,
    'ken_burns'
  ),
  (
    'ancient_civilization',
    'Ancient Civilization',
    'Layered parallax drift with atmospheric dust — ruins and epic past.',
    '{"scaleFrom":1.05,"scaleTo":1.13,"translateXFrom":-14,"translateXTo":14,"translateYFrom":0,"translateYTo":0,"parallaxOffset":22,"easing":"ease-out"}'::jsonb,
    '{"filter":"split[a][b];[a]scale=1.08,crop=iw:ih[c];[b]scale=1.13,crop=iw:ih[d];[c][d]overlay"}'::jsonb,
    'parallax'
  ),
  (
    'push_in',
    'Push In',
    'Slow Ken Burns push toward subject — hook and peak moments.',
    '{"scaleFrom":1,"scaleTo":1.18,"translateXFrom":0,"translateXTo":0,"translateYFrom":0,"translateYTo":0,"easing":"ease-out"}'::jsonb,
    '{"filter":"zoompan=z=''min(zoom+0.0015,1.18)'':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)"}'::jsonb,
    'ken_burns'
  ),
  (
    'pull_out',
    'Pull Out',
    'Reveal widening frame — tension release and context beats.',
    '{"scaleFrom":1.16,"scaleTo":1.02,"translateXFrom":0,"translateXTo":0,"translateYFrom":0,"translateYTo":0,"easing":"ease-out"}'::jsonb,
    '{"filter":"zoompan=z=''if(lte(zoom,1.0),1.16,max(1.001,zoom-0.0012))'':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)"}'::jsonb,
    'ken_burns'
  ),
  (
    'slow_pan_left',
    'Slow Pan Left',
    'Horizontal drift left across the frame.',
    '{"scaleFrom":1.1,"scaleTo":1.1,"translateXFrom":28,"translateXTo":-28,"translateYFrom":0,"translateYTo":0,"easing":"linear"}'::jsonb,
    '{"filter":"zoompan=z=1.1:d=125:x=''if(lte(on,1),0,x-1)'':y=ih/2-(ih/zoom/2)"}'::jsonb,
    'pan'
  ),
  (
    'slow_pan_right',
    'Slow Pan Right',
    'Horizontal drift right across the frame.',
    '{"scaleFrom":1.1,"scaleTo":1.1,"translateXFrom":-28,"translateXTo":28,"translateYFrom":0,"translateYTo":0,"easing":"linear"}'::jsonb,
    '{"filter":"zoompan=z=1.1:d=125:x=''if(lte(on,1),0,x+1)'':y=ih/2-(ih/zoom/2)"}'::jsonb,
    'pan'
  ),
  (
    'documentary_drift',
    'Documentary Drift',
    'Subtle handheld-style drift — observational documentary tone.',
    '{"scaleFrom":1.04,"scaleTo":1.08,"translateXFrom":-8,"translateXTo":10,"translateYFrom":4,"translateYTo":-6,"easing":"linear"}'::jsonb,
    '{"filter":"zoompan=z=''min(zoom+0.0008,1.08)'':d=125:x=''iw/2-(iw/zoom/2)+8*sin(on/20)'':y=''ih/2-(ih/zoom/2)+4*cos(on/25)''"}'::jsonb,
    'drift'
  ),
  (
    'orbit',
    'Orbit',
    'Gentle rotational orbit around center — dynamic without AI video.',
    '{"scaleFrom":1.08,"scaleTo":1.12,"translateXFrom":0,"translateXTo":0,"translateYFrom":0,"translateYTo":0,"rotateFrom":-0.6,"rotateTo":0.6,"easing":"ease-out"}'::jsonb,
    '{"filter":"rotate=0.006*sin(2*PI*t/8):c=none:ow=iw:oh=ih"}'::jsonb,
    'orbit'
  ),
  (
    'depth_parallax',
    'Depth Parallax',
    'Foreground/background separation via layered scale drift.',
    '{"scaleFrom":1.06,"scaleTo":1.14,"translateXFrom":-12,"translateXTo":12,"translateYFrom":0,"translateYTo":0,"parallaxOffset":18,"easing":"ease-out"}'::jsonb,
    '{"filter":"split[a][b];[a]scale=1.08,crop=iw:ih[c];[b]scale=1.14,crop=iw:ih[d];[c][d]overlay"}'::jsonb,
    'parallax'
  ),
  (
    'subtle_zoom',
    'Subtle Zoom',
    'Barely-there zoom — calm hold scenes and aftertaste.',
    '{"scaleFrom":1,"scaleTo":1.06,"translateXFrom":0,"translateXTo":0,"translateYFrom":0,"translateYTo":0,"easing":"ease-out"}'::jsonb,
    '{"filter":"zoompan=z=''min(zoom+0.0006,1.06)'':d=125:x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)"}'::jsonb,
    'ken_burns'
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  remotion_config = excluded.remotion_config,
  ffmpeg_filter = excluded.ffmpeg_filter,
  category = excluded.category;

alter table public.motion_presets enable row level security;

drop policy if exists "motion_presets public read" on public.motion_presets;
create policy "motion_presets public read"
  on public.motion_presets for select
  using (true);
