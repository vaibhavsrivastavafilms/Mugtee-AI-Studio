-- Freemium sponsored placements (admin-managed, analytics-tracked).

create table if not exists public.sponsored_placements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_url text,
  destination_url text not null,
  cta text not null default 'Learn more',
  placement_type text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsored_placements_placement_type_check
    check (placement_type in ('dashboard', 'generation_result', 'empty_state', 'resources'))
);

create index if not exists sponsored_placements_active_type_idx
  on public.sponsored_placements (placement_type, active, sort_order);

create table if not exists public.sponsored_placement_events (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null references public.sponsored_placements (id) on delete cascade,
  event_type text not null,
  user_id uuid references auth.users (id) on delete set null,
  session_id text,
  page_path text,
  created_at timestamptz not null default now(),
  constraint sponsored_placement_events_type_check
    check (event_type in ('impression', 'click'))
);

create index if not exists sponsored_placement_events_placement_idx
  on public.sponsored_placement_events (placement_id, event_type, created_at desc);

alter table public.sponsored_placements enable row level security;
alter table public.sponsored_placement_events enable row level security;

-- Public read of active placements (anon + auth)
drop policy if exists sponsored_placements_public_read on public.sponsored_placements;
create policy sponsored_placements_public_read on public.sponsored_placements
  for select using (active = true);

-- Events: authenticated users may insert their own analytics rows
drop policy if exists sponsored_placement_events_insert on public.sponsored_placement_events;
create policy sponsored_placement_events_insert on public.sponsored_placement_events
  for insert with check (auth.uid() = user_id or user_id is null);

comment on table public.sponsored_placements is
  'Admin-managed native sponsor cards shown to FREE plan users only';
comment on table public.sponsored_placement_events is
  'Impression and click events for sponsored placement analytics';

-- Seed default placements (inactive-safe examples; admin can activate/edit)
insert into public.sponsored_placements (
  title, description, image_url, destination_url, cta, placement_type, active, sort_order
) values
  (
    'Canva for Creators',
    'Create thumbnails and social graphics faster with pro templates.',
    null,
    'https://www.canva.com/',
    'Try Canva',
    'dashboard',
    true,
    10
  ),
  (
    'Need visuals for this script?',
    'Design scroll-stopping thumbnails and b-roll titles in minutes.',
    null,
    'https://www.canva.com/',
    'Try Canva',
    'generation_result',
    true,
    10
  ),
  (
    'Start with a proven creator stack',
    'Partner tools trusted by top faceless channels.',
    null,
    'https://www.capcut.com/',
    'Explore tools',
    'empty_state',
    true,
    10
  ),
  (
    'Creator Resource Library',
    'Free templates and design assets for your next reel.',
    null,
    'https://www.adobe.com/express/',
    'Browse resources',
    'resources',
    true,
    10
  );
