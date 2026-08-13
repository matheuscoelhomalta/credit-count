-- The public leaderboard: the only data interface an anonymous caller can reach.
--
-- anon holds no privilege on any base table, so this function is the entire
-- public surface of the system. Everything about it is deliberately narrow:
--
--   * zero arguments — the caller cannot filter, widen, or aim it at a user;
--   * a declared scalar return type — no base-table row type leaks through, so
--     adding a column to profiles or rides cannot silently publish it;
--   * fully qualified objects and an empty search_path — a caller-controlled
--     path cannot redirect any name inside the body;
--   * fixed SQL with no dynamic construction.
--
-- SECURITY DEFINER is required because the function must aggregate rows that
-- the calling role is not permitted to read. That is the whole exception, and
-- it is why the output columns are enumerated rather than selected with *.
create function public.leaderboard()
returns table (display_name text, credit_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.display_name,
    -- Distinct coasters, not ride rows: riding the same coaster twice is two
    -- rides but one credit (R-013).
    count(distinct r.coaster_id) as credit_count
  from public.profiles p
  -- Left joined so opting in always has a visible effect. A participant with no
  -- rides yet ranks last at zero rather than vanishing from their own opt-in.
  left join public.rides r on r.user_id = p.user_id
  where p.leaderboard_opt_in
  group by p.user_id, p.display_name
  order by count(distinct r.coaster_id) desc, p.display_name asc;
$$;

comment on function public.leaderboard() is
  'Public opt-in ranking. Returns only display_name and distinct credit_count; never user ids, ride dates, notes, or coaster identities.';

-- Supabase grants EXECUTE on new public functions to anon and authenticated by
-- default, and `revoke ... from public` does not remove those explicit grants.
-- Revoke by name first so the grant below is the only privilege that exists.
revoke all on function public.leaderboard() from public, anon, authenticated, service_role;
grant execute on function public.leaderboard() to anon, authenticated;
