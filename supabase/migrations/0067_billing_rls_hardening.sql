-- P0 — Prevent client-side tampering with billing plan, trial, usage counters, and subscriptions.

create or replace function public.is_service_role_request()
returns boolean
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(auth.jwt() ->> 'role', '')
  ) = 'service_role';
$$;

-- profiles: revert protected columns unless service role
create or replace function public.protect_profiles_billing_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_service_role_request() then
    return new;
  end if;

  new.plan_type := old.plan_type;
  new.trial_started_at := old.trial_started_at;
  new.trial_ends_at := old.trial_ends_at;
  new.trial_claimed := old.trial_claimed;
  new.projects_count := old.projects_count;
  new.generations_count := old.generations_count;
  new.exports_count := old.exports_count;
  new.renders_count := old.renders_count;

  return new;
end;
$$;

drop trigger if exists protect_profiles_billing on public.profiles;
create trigger protect_profiles_billing
  before update on public.profiles
  for each row
  execute function public.protect_profiles_billing_columns();

-- subscriptions: users may read own row only; writes via service role (billing API)
drop policy if exists subscriptions_insert_self on public.subscriptions;
drop policy if exists subscriptions_update_self on public.subscriptions;

drop policy if exists subscriptions_select_self on public.subscriptions;
create policy subscriptions_select_self on public.subscriptions
  for select using (auth.uid() = user_id);

comment on function public.protect_profiles_billing_columns is
  'Blocks authenticated clients from mutating plan_type, trial fields, and usage counters.';

-- P0 index health RPC (used by GET /api/generation/jobs/health)
create or replace function public.mugtee_p0_index_health()
returns table(index_name text, ok boolean)
language sql
security definer
set search_path = public
as $$
  select idx, exists(
    select 1 from pg_indexes i where i.schemaname = 'public' and i.indexname = idx
  )
  from unnest(array[
    'generation_jobs_project_active_idx',
    'generation_jobs_pipeline_status_idx',
    'export_jobs_project_active_idx'
  ]) as idx;
$$;

revoke all on function public.mugtee_p0_index_health() from public;
grant execute on function public.mugtee_p0_index_health() to service_role;
grant execute on function public.mugtee_p0_index_health() to authenticated;
