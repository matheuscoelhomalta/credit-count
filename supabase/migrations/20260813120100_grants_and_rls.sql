-- Authorization boundary for Credit Count.
--
-- Two independent mechanisms must both allow an operation:
--   1. object/column grants decide which operations a Data API role can attempt;
--   2. operation-specific RLS policies decide which rows it may touch.
--
-- Neither Next.js routing, layouts, proxy.ts, nor hidden UI is part of this boundary.

-- Supabase's default privileges hand anon and authenticated broad access to new
-- tables in public. Strip that first so every privilege below is deliberate.
revoke all on public.profiles from anon, authenticated;
revoke all on public.coasters from anon, authenticated;
revoke all on public.rides from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.coasters enable row level security;
alter table public.rides enable row level security;

-- Admin authority comes only from app_metadata, which users cannot edit through
-- the auth API. It is read from the verified JWT, so a role change takes effect
-- on the next token refresh (an accepted v1 trade-off, see TDD section 8).
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Ownership and coaster identity are immutable regardless of how privileges
-- evolve later; the column grants below are the first line, this is the second.
create or replace function public.rides_freeze_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'rides.user_id is immutable';
  end if;
  if new.coaster_id is distinct from old.coaster_id then
    raise exception 'rides.coaster_id is immutable';
  end if;
  return new;
end;
$$;

create trigger rides_freeze_identity
  before update on public.rides
  for each row execute function public.rides_freeze_identity();

-- ---------------------------------------------------------------------------
-- profiles: a user reads and edits only their own row. Insert exists solely as
-- a fallback; the auth trigger normally creates the row.
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant insert (user_id, display_name) on public.profiles to authenticated;
grant update (display_name, leaderboard_opt_in) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- coasters: every authenticated user reads the whole catalogue, including
-- retired entries, because their own history must still render a coaster name.
-- Browsing filters to active rows in the application; only admins mutate.
-- No DELETE privilege is granted to any API role: admin removal is retirement.
-- ---------------------------------------------------------------------------
grant select on public.coasters to authenticated;
grant insert on public.coasters to authenticated;
grant update on public.coasters to authenticated;

create policy coasters_select_authenticated on public.coasters
  for select to authenticated
  using (true);

create policy coasters_insert_admin on public.coasters
  for insert to authenticated
  with check ((select public.is_admin()));

create policy coasters_update_admin on public.coasters
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- rides: owner-only for every operation. There is deliberately no admin policy,
-- so administrators have exactly the same owner-scoped access as enthusiasts.
--
-- user_id is omitted from the INSERT grant so it can only take its auth.uid()
-- default; user_id and coaster_id are omitted from the UPDATE grant so neither
-- ownership nor coaster identity can be reassigned.
-- ---------------------------------------------------------------------------
grant select on public.rides to authenticated;
grant insert (coaster_id, ridden_on, note) on public.rides to authenticated;
grant update (ridden_on, note) on public.rides to authenticated;
grant delete on public.rides to authenticated;

create policy rides_select_own on public.rides
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- New rides must target an active coaster. Retired coasters therefore accept no
-- new history while their existing rides remain fully intact.
create policy rides_insert_own_active_coaster on public.rides
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.coasters c
      where c.id = coaster_id and c.active
    )
  );

-- No active-coaster requirement here: the owner of a ride against a retired
-- coaster must keep being able to correct its date or note (R-008).
create policy rides_update_own on public.rides
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy rides_delete_own on public.rides
  for delete to authenticated
  using ((select auth.uid()) = user_id);
