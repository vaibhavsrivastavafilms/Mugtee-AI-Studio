-- Virlo Intelligence Layer (Mugtee V7) — external market intelligence for Director Mode

create table if not exists public.viral_patterns (
  id                    uuid primary key default gen_random_uuid(),
  platform              text not null,
  topic                 text not null,
  framework             text not null,
  hook_type             text,
  emotion               text,
  curiosity_trigger     text,
  retention_strategy    text,
  shareability_score    int not null default 0 check (shareability_score between 0 and 100),
  saveability_score     int not null default 0 check (saveability_score between 0 and 100),
  virality_score        int not null default 0 check (virality_score between 0 and 100),
  story_quality_score   int not null default 0 check (story_quality_score between 0 and 100),
  framework_confidence  int not null default 0 check (framework_confidence between 0 and 100),
  source_url            text,
  raw_analysis          jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists viral_patterns_platform_idx on public.viral_patterns (platform);
create index if not exists viral_patterns_framework_idx on public.viral_patterns (framework);
create index if not exists viral_patterns_virality_idx on public.viral_patterns (virality_score desc);
create index if not exists viral_patterns_created_idx on public.viral_patterns (created_at desc);

alter table public.viral_patterns enable row level security;

drop policy if exists "viral_patterns read authenticated" on public.viral_patterns;
create policy "viral_patterns read authenticated"
  on public.viral_patterns for select
  to authenticated
  using (true);

comment on table public.viral_patterns is
  'Virlo V7 — seeded viral pattern intelligence readable by authenticated users; inserts via service role';

-- Optional aggregated market snapshot cache on creator intelligence graph
alter table public.creator_intelligence_graph
  add column if not exists virlo_market_snapshots jsonb not null default '{}'::jsonb;

comment on column public.creator_intelligence_graph.virlo_market_snapshots is
  'Cached Virlo market trend snapshots keyed by platform';

-- Dev seed data (migration runner bypasses RLS)
insert into public.viral_patterns (
  platform, topic, framework, hook_type, emotion, curiosity_trigger,
  retention_strategy, shareability_score, saveability_score, virality_score,
  story_quality_score, framework_confidence, source_url, raw_analysis
) values
  ('tiktok', 'morning routine productivity', 'routine-rewrite', 'contrarian', 'inspiration',
   'What if your morning routine is sabotaging your focus?', 'pattern interrupt at 0:08 + open loop payoff',
   82, 74, 88, 79, 91, null, '{"trend":"working_now","niche":"productivity"}'::jsonb),
  ('tiktok', 'psychology myths debunked', 'belief-shift', 'curiosity', 'surprise',
   'Everyone believes this — neuroscience says otherwise', 'stack 3 proofs then belief flip at 0:22',
   79, 68, 85, 81, 89, null, '{"trend":"working_now","niche":"psychology"}'::jsonb),
  ('instagram', 'fitness transformation', 'transformation-story', 'story', 'inspiration',
   'I was stuck for 2 years until I changed one habit', 'before/after contrast + mid-video struggle beat',
   76, 71, 83, 77, 86, null, '{"trend":"working_now","niche":"fitness"}'::jsonb),
  ('youtube-shorts', 'failed startup lessons', 'failure-to-wisdom', 'warning', 'empathy',
   'I lost $40k — here is the lesson nobody tells founders', 'confession hook + cost escalation + wisdom drop',
   81, 77, 84, 82, 88, null, '{"trend":"working_now","niche":"business"}'::jsonb),
  ('youtube-shorts', '30-day experiment results', 'experiment-story', 'number', 'curiosity',
   'I tried X for 30 days — the data surprised me', 'daily counter + results reveal at 0:35',
   78, 72, 86, 80, 87, null, '{"trend":"emerging","niche":"self-improvement"}'::jsonb),
  ('tiktok', 'unpopular finance opinion', 'contrarian-reveal', 'contrarian', 'surprise',
   'Stop doing what every finance guru recommends', 'norm setup → contrarian flip → proof',
   84, 69, 87, 78, 90, null, '{"trend":"working_now","niche":"finance"}'::jsonb),
  ('instagram', 'creator behind the scenes', 'creator-spotlight', 'story', 'curiosity',
   'How I actually made this viral video (full process)', 'process reveal + tool stack + outcome',
   73, 65, 79, 76, 84, null, '{"trend":"emerging","niche":"creator-economy"}'::jsonb),
  ('x', 'hot take thread hook', 'contrarian-reveal', 'contrarian', 'anger',
   'Unpopular opinion: the default advice is wrong', 'thread-style escalation with receipts',
   80, 58, 82, 74, 85, null, '{"trend":"working_now","niche":"thought-leadership"}'::jsonb),
  ('linkedin', 'career pivot story', 'transformation-story', 'story', 'inspiration',
   'I quit my VP role — here is what happened next', 'status drop + vulnerability + new identity',
   71, 76, 78, 80, 83, null, '{"trend":"emerging","niche":"career"}'::jsonb),
  ('tiktok', 'day in my life vlog', 'creator-spotlight', 'story', 'curiosity',
   'A realistic day building content full-time', 'routine montage + one unexpected conflict',
   62, 55, 68, 65, 72, null, '{"trend":"oversaturated","niche":"lifestyle"}'::jsonb),
  ('instagram', 'generic motivation quotes', 'belief-shift', 'question', 'inspiration',
   'Are you living your best life?', 'text-on-screen + stock b-roll',
   45, 38, 52, 48, 55, null, '{"trend":"fading","niche":"motivation"}'::jsonb),
  ('youtube-shorts', 'listicle top 10 tips', 'routine-rewrite', 'number', 'curiosity',
   '10 habits that changed my life', 'rapid list without narrative arc',
   58, 52, 61, 54, 60, null, '{"trend":"oversaturated","niche":"self-help"}'::jsonb),
  ('tiktok', 'AI tools roundup', 'experiment-story', 'number', 'surprise',
   'I tested 5 AI tools so you do not have to', 'comparison matrix + winner reveal',
   77, 70, 84, 75, 86, null, '{"trend":"working_now","niche":"tech"}'::jsonb),
  ('linkedin', 'leadership failure story', 'failure-to-wisdom', 'warning', 'empathy',
   'The worst decision I made as a manager', 'stakes + mistake + reframed leadership principle',
   74, 78, 76, 83, 87, null, '{"trend":"emerging","niche":"leadership"}'::jsonb),
  ('instagram', 'myth vs fact skincare', 'belief-shift', 'curiosity', 'surprise',
   'Dermatologists hate this myth — here is the truth', 'myth dramatization + expert framing',
   75, 73, 80, 78, 85, null, '{"trend":"working_now","niche":"beauty"}'::jsonb);
