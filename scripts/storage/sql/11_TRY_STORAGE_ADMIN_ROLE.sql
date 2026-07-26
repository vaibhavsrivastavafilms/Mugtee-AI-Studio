-- =============================================================================
-- Attempt cleanup as storage owner role (often fails on hosted Supabase)
-- If this errors with "permission denied to set role", use Dashboard path below.
-- =============================================================================

-- Try elevating (may fail — that is OK)
do $$
begin
  begin
    execute 'set local role supabase_storage_admin';
  exception
    when insufficient_privilege then
      raise exception using
        message = 'Cannot SET ROLE supabase_storage_admin from SQL Editor.',
        hint = 'Use Dashboard → Storage to delete files, OR temporarily upgrade the Free plan so Storage API works, then run: npm run storage:purge-all';
  end;
end $$;
