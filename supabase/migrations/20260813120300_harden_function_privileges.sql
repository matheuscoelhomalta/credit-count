-- Least privilege for functions.
--
-- Supabase ships ALTER DEFAULT PRIVILEGES that grant EXECUTE on every new
-- function in `public` to anon, authenticated, and service_role. A plain
-- `revoke ... from public` does not remove those explicit grants, so each one
-- must be revoked by name.
--
-- Trigger functions in particular should be callable by no API role at all:
-- PostgreSQL checks EXECUTE when a trigger is created, not when it fires, so
-- revoking here does not affect the triggers already defined.

revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;
revoke all on function public.rides_freeze_identity() from public, anon, authenticated, service_role;

-- handle_new_user is SECURITY DEFINER. Postgres already refuses to invoke a
-- trigger-returning function directly, but an anon-executable definer function
-- should not exist in the first place.
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

-- is_admin is SECURITY INVOKER and only reads the caller's own verified JWT.
-- Authenticated callers need it because the catalogue policies invoke it;
-- anonymous callers have no policy that references it.
revoke all on function public.is_admin() from public, anon, service_role;
grant execute on function public.is_admin() to authenticated;
