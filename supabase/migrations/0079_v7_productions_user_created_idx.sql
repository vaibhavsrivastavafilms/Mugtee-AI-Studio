-- Recent Projects (newest sort) — user-scoped created_at ordering
create index if not exists v7_productions_user_created_idx
  on public.v7_productions (user_id, created_at desc);
