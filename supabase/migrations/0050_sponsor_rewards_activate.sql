-- Activate sponsor rewards: atomic click recording + daily reward idempotency.
-- Safe to re-run (idempotent).

create table if not exists public.sponsor_clicks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  sponsor       text not null,
  rewarded      boolean not null default false,
  credits_given integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists sponsor_clicks_user_day_idx
  on public.sponsor_clicks (user_id, sponsor, ((created_at at time zone 'utc')::date));

create index if not exists sponsor_clicks_sponsor_idx
  on public.sponsor_clicks (sponsor, created_at desc);

-- One rewarded claim per user + sponsor per UTC day (race-safe).
create unique index if not exists sponsor_clicks_rewarded_daily_uniq
  on public.sponsor_clicks (user_id, sponsor, ((created_at at time zone 'utc')::date))
  where rewarded = true;

alter table public.sponsor_clicks enable row level security;

drop policy if exists "sponsor_clicks self read" on public.sponsor_clicks;
create policy "sponsor_clicks self read"
  on public.sponsor_clicks for select
  using (auth.uid() = user_id);

drop policy if exists "sponsor_clicks self insert" on public.sponsor_clicks;
create policy "sponsor_clicks self insert"
  on public.sponsor_clicks for insert
  with check (auth.uid() = user_id);

-- Server-side atomic recorder (service role only — called from /api/sponsor).
create or replace function public.record_sponsor_click(
  p_user_id uuid,
  p_sponsor text,
  p_reward integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_already boolean;
  v_rewarded boolean;
  v_credits integer;
begin
  if p_user_id is null or coalesce(trim(p_sponsor), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  v_start := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_end := v_start + interval '1 day';

  select exists(
    select 1
    from public.sponsor_clicks
    where user_id = p_user_id
      and sponsor = p_sponsor
      and rewarded = true
      and created_at >= v_start
      and created_at < v_end
  ) into v_already;

  v_rewarded := not v_already;
  v_credits := case when v_rewarded then greatest(0, coalesce(p_reward, 0)) else 0 end;

  begin
    insert into public.sponsor_clicks (user_id, sponsor, rewarded, credits_given)
    values (p_user_id, p_sponsor, v_rewarded, v_credits);
  exception
    when unique_violation then
      -- Concurrent rewarded insert — log analytics row without reward.
      v_rewarded := false;
      v_credits := 0;
      v_already := true;
      insert into public.sponsor_clicks (user_id, sponsor, rewarded, credits_given)
      values (p_user_id, p_sponsor, false, 0);
  end;

  return jsonb_build_object(
    'ok', true,
    'rewarded', v_rewarded,
    'credits_given', v_credits,
    'already_claimed_today', v_already and not v_rewarded
  );
end;
$$;

revoke all on function public.record_sponsor_click(uuid, text, integer) from public;
grant execute on function public.record_sponsor_click(uuid, text, integer) to service_role;

comment on function public.record_sponsor_click is
  'Insert sponsor click; grant credits on first rewarded claim per user+sponsor per UTC day.';
